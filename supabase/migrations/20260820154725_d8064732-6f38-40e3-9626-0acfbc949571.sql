CREATE OR REPLACE FUNCTION public.apply_co_contract_delta()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract_id uuid;
  v_old_amt numeric := 0;
  v_new_amt numeric := 0;
  v_was_applied boolean;
  v_is_applied boolean;
BEGIN
  -- A change order stays baked into the contract once it is approved and then
  -- advances to contracted / completed. Previously only 'approved' counted, so
  -- moving a CO forward silently removed its value from the contract sum.
  v_was_applied := (TG_OP = 'UPDATE'
                    AND OLD.status IN ('approved','contracted','completed')
                    AND OLD.approved_at IS NOT NULL);
  v_is_applied  := (NEW.status IN ('approved','contracted','completed')
                    AND NEW.approved_at IS NOT NULL);

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
$function$;

-- Backfill: recompute co_approved_sum from the live CO set so contracts that
-- lost a contracted/completed CO are made whole again.
WITH applied AS (
  SELECT public._co_target_contract_id(co.project_id, co.org_id, co.assigned_to_org_id) AS contract_id,
         SUM(public.co_grand_total(co.id)) AS amt
  FROM public.change_orders co
  WHERE co.status IN ('approved','contracted','completed')
    AND co.approved_at IS NOT NULL
    AND co.org_id IS NOT NULL AND co.assigned_to_org_id IS NOT NULL
  GROUP BY 1
)
UPDATE public.project_contracts pc
   SET contract_sum = COALESCE(pc.original_contract_sum, GREATEST(COALESCE(pc.contract_sum,0) - COALESCE(pc.co_approved_sum,0), 0)) + COALESCE(a.amt, 0),
       co_approved_sum = COALESCE(a.amt, 0),
       updated_at = now()
  FROM applied a
 WHERE a.contract_id = pc.id
   AND COALESCE(pc.co_approved_sum, 0) <> COALESCE(a.amt, 0);