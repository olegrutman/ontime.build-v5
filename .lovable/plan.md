
# Plan: Fix Contract Direction Validation Trigger

## Problem Identified

There is a semantic mismatch between two database triggers:

1. **Contract Creation Trigger** (`convert_change_order_to_contract`):
   - Uses `from_org_id` = CONTRACTOR (sender of invoices)
   - Uses `to_org_id` = CLIENT (receiver/payer)
   - Example: FC -> TC contract means FC (contractor) bills TC (client)

2. **Validation Trigger** (`validate_contract_direction`):
   - Uses `from_org_id` = CLIENT (payer/hirer)
   - Uses `to_org_id` = CONTRACTOR (receiver)
   - This is the OPPOSITE semantic!

When the work order finalization creates an FC -> TC contract (FC bills TC), the validation trigger incorrectly interprets it as "FC is trying to HIRE TC" and rejects it.

## Root Cause

The validation trigger was updated in migration `20260129165520` with comments stating "from_org is the CLIENT" - but this contradicts:
- The contract creation trigger
- The system memory note: "from_org_id represents the Contractor (sender of invoices)"
- The invoice creation flow where `from_org` creates invoices

## Solution

Update the `validate_contract_direction` trigger to use the correct semantic where:
- `from_org_id` = CONTRACTOR (invoice sender)
- `to_org_id` = CLIENT (payer)

### Valid Contract Directions (CONTRACTOR -> CLIENT)
| From (Contractor) | To (Client) | Description |
|-------------------|-------------|-------------|
| TC | GC | Trade Contractor bills General Contractor |
| FC | TC | Field Crew bills Trade Contractor |
| Supplier | GC | Supplier bills General Contractor |
| Supplier | TC | Supplier bills Trade Contractor |

### Invalid Contract Directions
- GC cannot bill TC (GC is always client, never contractor)
- GC cannot bill FC
- TC cannot bill FC (TC hires FC, not the other way)

## Database Migration

```sql
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
```

## Files to Modify

| File | Action |
|------|--------|
| New SQL Migration | Fix `validate_contract_direction` trigger with correct semantic |

## Expected Outcome

After this fix:
1. GC can finalize work orders without errors
2. TC -> GC contracts are created correctly
3. FC -> TC contracts are created correctly (when FC labor exists)
4. The validation still prevents truly invalid contracts (e.g., GC trying to bill FC)
