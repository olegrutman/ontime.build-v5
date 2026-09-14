CREATE OR REPLACE FUNCTION public.enforce_nte_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _co RECORD;
  _current_total numeric;
BEGIN
  IF NEW.is_actual_cost THEN
    RETURN NEW;
  END IF;

  SELECT pricing_type, nte_cap, use_fc_pricing_base
  INTO _co
  FROM public.change_orders
  WHERE id = NEW.co_id;

  IF _co.pricing_type <> 'nte' OR _co.nte_cap IS NULL OR _co.nte_cap <= 0 THEN
    RETURN NEW;
  END IF;

  -- When the subcontractor prices from the crew's submitted time, the crew rows
  -- and the subcontractor's mirrored rows represent the SAME work. Counting both
  -- would double the billable labor and falsely trip the cap, so only the
  -- subcontractor's own billable rows count in that mode.
  IF COALESCE(_co.use_fc_pricing_base, false) THEN
    IF NEW.entered_by_role <> 'TC' THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(line_total), 0)
    INTO _current_total
    FROM public.co_labor_entries
    WHERE co_id = NEW.co_id
      AND NOT is_actual_cost
      AND entered_by_role = 'TC'
      AND id <> NEW.id;
  ELSE
    SELECT COALESCE(SUM(line_total), 0)
    INTO _current_total
    FROM public.co_labor_entries
    WHERE co_id = NEW.co_id
      AND NOT is_actual_cost
      AND id <> NEW.id;
  END IF;

  IF _current_total + NEW.line_total > _co.nte_cap THEN
    RAISE EXCEPTION 'NTE cap reached (%.2f / %.2f). Request a cap increase before adding more.',
      _current_total + NEW.line_total, _co.nte_cap
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;