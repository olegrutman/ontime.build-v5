CREATE OR REPLACE FUNCTION public.apply_co_owner_contract_delta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_contract_id uuid;
  v_old_amount numeric := 0;
  v_new_amount numeric := 0;
  v_delta numeric;
  v_was_applied boolean;
  v_is_applied boolean;
BEGIN
  -- Owner revenue is separate from the downstream contract delta. Apply the
  -- GC's explicit owner price only while the CO is approved and passed through.
  v_was_applied := (
    TG_OP = 'UPDATE'
    AND OLD.status IN ('approved', 'contracted', 'completed')
    AND OLD.approved_at IS NOT NULL
    AND OLD.passed_to_owner = true
    AND COALESCE(OLD.gc_budget, 0) > 0
  );
  v_is_applied := (
    NEW.status IN ('approved', 'contracted', 'completed')
    AND NEW.approved_at IS NOT NULL
    AND NEW.passed_to_owner = true
    AND COALESCE(NEW.gc_budget, 0) > 0
  );

  IF v_was_applied THEN v_old_amount := OLD.gc_budget; END IF;
  IF v_is_applied THEN v_new_amount := NEW.gc_budget; END IF;
  v_delta := v_new_amount - v_old_amount;

  IF v_delta = 0 OR NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Exactly one party on a CO can own its Owner -> General Contractor row.
  SELECT pc.id INTO v_owner_contract_id
  FROM public.project_contracts pc
  WHERE pc.project_id = NEW.project_id
    AND pc.from_role = 'Owner'
    AND pc.to_role = 'General Contractor'
    AND pc.to_org_id IN (NEW.org_id, NEW.assigned_to_org_id)
  ORDER BY pc.created_at ASC
  LIMIT 1;

  IF v_owner_contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.project_contracts
  SET contract_sum = COALESCE(contract_sum, 0) + v_delta,
      owner_contract_value = CASE
        WHEN owner_contract_value IS NULL THEN NULL
        ELSE COALESCE(owner_contract_value, 0) + v_delta
      END,
      co_approved_sum = GREATEST(COALESCE(co_approved_sum, 0) + v_delta, 0),
      updated_at = now()
  WHERE id = v_owner_contract_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.apply_co_owner_contract_delta() IS
  'Applies approved, passed-through CO owner prices to the Owner -> GC contract; reverses on withdrawal and follows explicit owner-price edits.';

DROP TRIGGER IF EXISTS trg_apply_co_owner_contract_delta ON public.change_orders;
CREATE TRIGGER trg_apply_co_owner_contract_delta
AFTER UPDATE OF status, approved_at, gc_budget, passed_to_owner ON public.change_orders
FOR EACH ROW
EXECUTE FUNCTION public.apply_co_owner_contract_delta();