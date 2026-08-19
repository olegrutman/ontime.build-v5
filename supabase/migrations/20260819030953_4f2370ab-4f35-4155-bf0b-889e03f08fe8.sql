ALTER TABLE public.project_contracts
  ADD COLUMN IF NOT EXISTS original_contract_sum numeric;

UPDATE public.project_contracts
   SET original_contract_sum = GREATEST(COALESCE(contract_sum,0) - COALESCE(co_approved_sum,0), 0)
 WHERE original_contract_sum IS NULL;

CREATE OR REPLACE FUNCTION public.sync_original_contract_sum()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.original_contract_sum IS NULL THEN
      NEW.original_contract_sum := GREATEST(COALESCE(NEW.contract_sum,0) - COALESCE(NEW.co_approved_sum,0), 0);
    END IF;
    RETURN NEW;
  END IF;

  -- Never let the CO trigger's contract_sum bump change the original value.
  IF NEW.original_contract_sum IS NULL THEN
    NEW.original_contract_sum := COALESCE(OLD.original_contract_sum,
      GREATEST(COALESCE(NEW.contract_sum,0) - COALESCE(NEW.co_approved_sum,0), 0));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_original_contract_sum ON public.project_contracts;
CREATE TRIGGER trg_sync_original_contract_sum
BEFORE INSERT OR UPDATE ON public.project_contracts
FOR EACH ROW EXECUTE FUNCTION public.sync_original_contract_sum();