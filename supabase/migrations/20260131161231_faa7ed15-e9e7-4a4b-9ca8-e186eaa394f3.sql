-- Fix the validate_contract_direction trigger to use correct semantic:
-- from_org = CONTRACTOR (bills/invoices), to_org = CLIENT (pays)

CREATE OR REPLACE FUNCTION public.validate_contract_direction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Prevent self-referential contracts
  IF NEW.from_org_id = NEW.to_org_id AND NEW.from_org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Contract cannot have the same organization on both sides';
  END IF;

  -- from_org is the CONTRACTOR (bills/invoices), to_org is the CLIENT (pays)
  -- Valid flows:
  --   TC -> GC (TC bills GC)
  --   FC -> TC (FC bills TC)
  --   Supplier -> GC (Supplier bills GC)
  --   Supplier -> TC (Supplier bills TC)
  --
  -- Invalid: GC cannot bill anyone downstream
  IF NEW.from_role = 'General Contractor' THEN
    RAISE EXCEPTION 'Invalid contract direction: General Contractor cannot be the contractor/invoicer.';
  END IF;

  -- Invalid: FC can only bill TC
  IF NEW.from_role = 'Field Crew' AND NEW.to_role != 'Trade Contractor' THEN
    RAISE EXCEPTION 'Invalid contract direction: Field Crew can only bill Trade Contractors.';
  END IF;

  -- Invalid: TC can only bill GC
  IF NEW.from_role = 'Trade Contractor' AND NEW.to_role != 'General Contractor' THEN
    RAISE EXCEPTION 'Invalid contract direction: Trade Contractor can only bill General Contractors.';
  END IF;

  -- Invalid: Supplier can only bill GC or TC
  IF NEW.from_role = 'Supplier' AND NEW.to_role NOT IN ('General Contractor', 'Trade Contractor') THEN
    RAISE EXCEPTION 'Invalid contract direction: Supplier can only bill General Contractors or Trade Contractors.';
  END IF;

  RETURN NEW;
END;
$function$;