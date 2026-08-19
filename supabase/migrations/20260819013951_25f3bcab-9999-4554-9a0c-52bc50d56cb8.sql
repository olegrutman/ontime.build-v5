-- CO SOVs: each approved change order gets its own schedule of values instead of
-- polluting the base contract SOV percentages.

ALTER TABLE public.project_sov
  ADD COLUMN IF NOT EXISTS sov_kind text NOT NULL DEFAULT 'base',
  ADD COLUMN IF NOT EXISTS source_co_id uuid REFERENCES public.change_orders(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_sov_sov_kind_check'
  ) THEN
    ALTER TABLE public.project_sov
      ADD CONSTRAINT project_sov_sov_kind_check CHECK (sov_kind IN ('base', 'change_order'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS project_sov_source_co_id_key
  ON public.project_sov (source_co_id) WHERE source_co_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_sov_kind ON public.project_sov (project_id, sov_kind);

-- Builds (or refreshes) the SOV that belongs to a single approved change order.
-- Fixed-price COs only: T&M / NTE work orders keep the direct invoice path.
CREATE OR REPLACE FUNCTION public.build_co_sov(_co_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _co RECORD;
  _sov_id uuid;
  _contract_id uuid;
  _mat_resp text;
  _eq_resp text;
  _mats numeric := 0;
  _eq numeric := 0;
  _total numeric := 0;
  _sort int := 0;
BEGIN
  SELECT id, project_id, co_number, title, status, pricing_type,
         co_material_responsible_override, materials_responsible,
         co_equipment_responsible_override, equipment_responsible
    INTO _co
  FROM public.change_orders WHERE id = _co_id;

  IF _co.id IS NULL OR LOWER(COALESCE(_co.status, '')) <> 'approved' THEN
    RETURN NULL;
  END IF;
  IF LOWER(COALESCE(_co.pricing_type, 'fixed')) IN ('tm', 'nte') THEN
    RETURN NULL;
  END IF;

  -- Never rewrite a CO SOV that has already been billed.
  SELECT id INTO _sov_id FROM public.project_sov WHERE source_co_id = _co_id;
  IF _sov_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.invoices WHERE sov_id = _sov_id) THEN
    RETURN _sov_id;
  END IF;

  SELECT pc.id INTO _contract_id
  FROM public.project_contracts pc
  WHERE pc.project_id = _co.project_id
  ORDER BY (COALESCE(pc.from_role, '') = 'Owner'), pc.created_at
  LIMIT 1;

  _mat_resp := COALESCE(_co.co_material_responsible_override, _co.materials_responsible, 'TC');
  _eq_resp  := COALESCE(_co.co_equipment_responsible_override, _co.equipment_responsible, 'TC');

  IF _mat_resp <> 'GC' THEN
    SELECT COALESCE(SUM(billed_amount), 0) INTO _mats
    FROM public.co_material_items WHERE co_id = _co_id;
  END IF;
  IF _eq_resp <> 'GC' THEN
    SELECT COALESCE(SUM(billed_amount), 0) INTO _eq
    FROM public.co_equipment_items WHERE co_id = _co_id;
  END IF;

  IF _sov_id IS NULL THEN
    INSERT INTO public.project_sov (project_id, contract_id, sov_name, sov_kind, source_co_id)
    VALUES (_co.project_id, _contract_id,
            COALESCE(NULLIF(_co.co_number, ''), 'CO') || ' — ' || COALESCE(NULLIF(_co.title, ''), 'Change order'),
            'change_order', _co_id)
    RETURNING id INTO _sov_id;
  ELSE
    DELETE FROM public.project_sov_items WHERE sov_id = _sov_id;
  END IF;

  -- One SOV line per priced CO scope line (billable labor only).
  WITH lines AS (
    SELECT li.id, li.item_name, li.sort_order,
           COALESCE((SELECT SUM(le.line_total) FROM public.co_labor_entries le
                     WHERE le.co_line_item_id = li.id AND NOT le.is_actual_cost), 0) AS amount
    FROM public.co_line_items li
    WHERE li.co_id = _co_id
  )
  INSERT INTO public.project_sov_items
    (project_id, sov_id, sort_order, item_name, item_group, source, value_amount, scheduled_value)
  SELECT _co.project_id, _sov_id,
         ROW_NUMBER() OVER (ORDER BY COALESCE(sort_order, 0), item_name),
         COALESCE(NULLIF(item_name, ''), 'CO line'),
         'Change order', 'template', amount, amount
  FROM lines
  WHERE amount > 0;

  SELECT COALESCE(MAX(sort_order), 0) INTO _sort FROM public.project_sov_items WHERE sov_id = _sov_id;

  IF _mats > 0 THEN
    _sort := _sort + 1;
    INSERT INTO public.project_sov_items
      (project_id, sov_id, sort_order, item_name, item_group, source, value_amount, scheduled_value)
    VALUES (_co.project_id, _sov_id, _sort, 'Materials', 'Change order', 'template', _mats, _mats);
  END IF;

  IF _eq > 0 THEN
    _sort := _sort + 1;
    INSERT INTO public.project_sov_items
      (project_id, sov_id, sort_order, item_name, item_group, source, value_amount, scheduled_value)
    VALUES (_co.project_id, _sov_id, _sort, 'Equipment', 'Change order', 'template', _eq, _eq);
  END IF;

  -- Percent basis is the CO's own total, so the base contract SOV keeps its 100%.
  SELECT COALESCE(SUM(value_amount), 0) INTO _total
  FROM public.project_sov_items WHERE sov_id = _sov_id;

  IF _total > 0 THEN
    UPDATE public.project_sov_items
    SET percent_of_contract = ROUND((value_amount / _total) * 100, 2),
        remaining_amount = value_amount
    WHERE sov_id = _sov_id;
  END IF;

  RETURN _sov_id;
END;
$$;

REVOKE ALL ON FUNCTION public.build_co_sov(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.build_co_sov(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_co_sov_on_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sov_id uuid;
BEGIN
  IF LOWER(COALESCE(NEW.status, '')) = 'approved'
     AND LOWER(COALESCE(OLD.status, '')) IS DISTINCT FROM 'approved' THEN
    PERFORM public.build_co_sov(NEW.id);
  ELSIF LOWER(COALESCE(OLD.status, '')) = 'approved'
     AND LOWER(COALESCE(NEW.status, '')) IS DISTINCT FROM 'approved' THEN
    SELECT id INTO _sov_id FROM public.project_sov WHERE source_co_id = NEW.id;
    IF _sov_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.invoices WHERE sov_id = _sov_id) THEN
      DELETE FROM public.project_sov WHERE id = _sov_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Retire the old parallel path that injected CO lines into co_sov_lines.
DROP TRIGGER IF EXISTS trg_sync_co_sov_lines ON public.change_orders;

DROP TRIGGER IF EXISTS trg_sync_co_sov_on_status ON public.change_orders;
CREATE TRIGGER trg_sync_co_sov_on_status
AFTER UPDATE OF status ON public.change_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_co_sov_on_status();

-- Backfill: every already-approved fixed-price CO gets its own SOV.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.change_orders
    WHERE LOWER(COALESCE(status, '')) = 'approved'
      AND LOWER(COALESCE(pricing_type, 'fixed')) NOT IN ('tm', 'nte')
  LOOP
    PERFORM public.build_co_sov(r.id);
  END LOOP;
END $$;