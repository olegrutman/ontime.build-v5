-- Fix the validate_contract_direction trigger
-- The logic was backwards: from_org is the CLIENT (payer), to_org is the CONTRACTOR (receiver)
-- Valid contract directions (from payer's perspective):
--   GC → TC (GC hires TC) ✓
--   GC → Supplier (GC buys from Supplier) ✓
--   TC → FC (TC hires FC) ✓
--   TC → Supplier (TC buys from Supplier) ✓
--   TC → GC (TC's upstream contract with GC who hired them) ✓
--
-- For invoicing, the contractor (to_org) invoices the client (from_org)
-- So invoice direction is reverse: TC invoices GC, FC invoices TC

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

  -- from_org is the CLIENT (pays/hires), to_org is the CONTRACTOR (receives payment)
  -- Valid: GC→TC, GC→Supplier, TC→FC, TC→Supplier, TC→GC (for TC's upstream contract)
  -- 
  -- Invalid combinations:
  -- FC cannot be the client hiring anyone
  IF NEW.from_role = 'Field Crew' AND NEW.to_role IN ('General Contractor', 'Trade Contractor') THEN
    RAISE EXCEPTION 'Invalid contract direction: Field Crew cannot hire General Contractors or Trade Contractors.';
  END IF;

  RETURN NEW;
END;
$function$;