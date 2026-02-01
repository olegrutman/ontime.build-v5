
# Plan: Fix FC Invoice Contract Selection Issue - COMPLETED ✅

## Problem Summary
Field Crew (FC) users cannot see the "main contract" when creating invoices to bill the Trade Contractor (TC). They can only see Work Order Labor contracts.

## Solution Applied

### Phase 1: Fixed Contract Creation Logic ✅

Updated the following files to use correct contract direction:

- `src/pages/CreateProjectNew.tsx` - Contract direction now based on worker/payer relationship
- `src/pages/EditProject.tsx` - Same fix applied  
- `src/components/project/AddTeamMemberDialog.tsx` - Same fix applied

**Logic:**
```
When creating a contract:
- If creator is GC or (TC inviting FC):
  - from_org_id = Invitee org (the worker/invoicer)
  - to_org_id = Creator org (the payer)
  
- Otherwise (e.g., TC inviting GC):
  - from_org_id = Creator org (the worker/invoicer)
  - to_org_id = Invitee org (the payer)
```

### Phase 2: Data Migration ✅

Ran SQL to fix existing contracts:
```sql
UPDATE project_contracts
SET 
  from_org_id = to_org_id,
  to_org_id = from_org_id,
  from_role = to_role,
  to_role = from_role
WHERE 
  from_role = 'Trade Contractor' 
  AND to_role = 'Field Crew'
  AND (trade IS NULL OR trade NOT IN ('Work Order', 'Work Order Labor'));
```

## Testing Checklist

1. ✅ Create a new project as TC, invite FC - Contract now stored with FC as `from_org`
2. ✅ Log in as FC, navigate to Invoices tab - Main contract now appears in dropdown
3. ✅ Existing invoices unaffected (linked by contract_id)
4. ✅ SOVs unaffected (linked by contract_id)
