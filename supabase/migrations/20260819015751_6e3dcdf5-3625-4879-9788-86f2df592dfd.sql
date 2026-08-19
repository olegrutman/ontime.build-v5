ALTER TABLE public.project_contracts
  ADD COLUMN IF NOT EXISTS co_approved_sum numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.project_contracts.co_approved_sum IS
  'Portion of contract_sum contributed by approved change orders. Base contract = contract_sum - co_approved_sum. Maintained by apply_co_contract_delta.';

-- Backfill from currently approved COs
WITH applied AS (
  SELECT public._co_target_contract_id(co.project_id, co.org_id, co.assigned_to_org_id) AS contract_id,
         public.co_grand_total(co.id) AS amt
  FROM public.change_orders co
  WHERE co.status = 'approved' AND co.approved_at IS NOT NULL
    AND co.org_id IS NOT NULL AND co.assigned_to_org_id IS NOT NULL AND co.project_id IS NOT NULL
),
rolled AS (
  SELECT contract_id, COALESCE(SUM(amt), 0) AS total
  FROM applied WHERE contract_id IS NOT NULL GROUP BY contract_id
)
UPDATE public.project_contracts pc
   SET co_approved_sum = r.total
  FROM rolled r
 WHERE pc.id = r.contract_id;

CREATE OR REPLACE FUNCTION public.apply_co_contract_delta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
  v_old_amt numeric := 0;
  v_new_amt numeric := 0;
  v_was_applied boolean;
  v_is_applied boolean;
BEGIN
  v_was_applied := (TG_OP = 'UPDATE' AND OLD.status = 'approved' AND OLD.approved_at IS NOT NULL);
  v_is_applied  := (NEW.status = 'approved' AND NEW.approved_at IS NOT NULL);

  IF NEW.org_id IS NULL OR NEW.assigned_to_org_id IS NULL OR NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_contract_id := public._co_target_contract_id(NEW.project_id, NEW.org_id, NEW.assigned_to_org_id);
  IF v_contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_was_applied THEN v_old_amt := public.co_grand_total(NEW.id); END IF;
  IF v_is_applied  THEN v_new_amt := public.co_grand_total(NEW.id); END IF;

  IF v_old_amt <> v_new_amt THEN
    UPDATE public.project_contracts
       SET contract_sum = COALESCE(contract_sum, 0) + (v_new_amt - v_old_amt),
           co_approved_sum = GREATEST(COALESCE(co_approved_sum, 0) + (v_new_amt - v_old_amt), 0),
           updated_at = now()
     WHERE id = v_contract_id;
  END IF;

  RETURN NEW;
END;
$$;