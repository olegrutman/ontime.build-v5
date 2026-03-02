

# Fix RLS Policy for Supplier Invoice Creation

## Root Cause

The current INSERT policy on the `invoices` table only allows inserts when `contract_id` matches a `project_contracts` record where the user belongs to `from_org_id`. Supplier invoices are created with `contract_id = NULL` (suppliers bill directly from POs, not contracts), so the policy blocks them.

## Fix

### 1. Update the INSERT RLS policy on `invoices`

Add an alternative path: allow INSERT when `contract_id IS NULL` AND the user belongs to the supplier organization linked to the referenced PO.

```text
Current policy (contract-based only):
  EXISTS (SELECT 1 FROM project_contracts pc
    WHERE pc.id = invoices.contract_id
    AND pc.from_org_id IN (user's orgs))

New policy (contract-based OR PO-supplier-based):
  (existing contract check)
  OR
  (contract_id IS NULL
   AND po_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.id = invoices.po_id
     AND s.organization_id IN (user's orgs)))
```

### 2. Update SELECT policy to cover contract-less invoices

The SELECT policy already has a fallback for `contract_id IS NULL` using `project_participants`. This should work for supplier invoices since suppliers are project participants. No change needed here.

### 3. Update DELETE policy for supplier draft invoices

Add the same PO-supplier path so suppliers can delete their own draft invoices.

### 4. Update UPDATE policy for supplier invoices

Add the PO-supplier path so suppliers can update/submit their draft invoices.

## Technical Details

### Database migration SQL

Drop and recreate the affected policies:

- **INSERT**: Add `OR (contract_id IS NULL AND po_id IS NOT NULL AND user belongs to PO's supplier org)` 
- **DELETE**: Add same alternative for DRAFT status supplier invoices
- **UPDATE**: Add alternative path for supplier invoices in both USING and WITH CHECK

### Files Changed

| File | Action |
|------|--------|
| Database migration | Update 3 RLS policies on `invoices` table |

No application code changes needed -- the `CreateSupplierInvoiceFromPO` component is correct, it just needs the RLS gate opened.

