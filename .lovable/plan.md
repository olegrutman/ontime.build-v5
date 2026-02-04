
# Fix: PDF Upload Button Not Appearing in Estimate Detail

## Problem Identified

The PDF upload button is conditionally rendered based on `supplierId` being available. Looking at the code (lines 639-648 of `SupplierProjectEstimates.tsx`):

```typescript
{supplierId && (
  <EstimatePDFUpload
    estimateId={selectedEstimate.id}
    supplierId={supplierId}
    ...
  />
)}
```

The `supplierId` is fetched in a `useEffect` hook (lines 332-343), which queries the `suppliers` table looking for a record matching the current organization. If this query fails or returns no data, `supplierId` remains `null` and the PDF upload component doesn't render.

## Root Cause

The current implementation requires a record in the `suppliers` table that matches the organization. This is a data issue - if there's no supplier record for the user's organization, the PDF upload won't show.

## Current User Flow
1. User logs in as a Supplier organization user
2. User navigates to `/estimates`
3. User clicks "New Estimate" to create an estimate
4. User clicks on an estimate card to open the detail sheet
5. The "Upload" tab should show the PDF upload component
6. **BUT** if `supplierId` is null, the component doesn't render - only the CSV fallback shows

## Solution

### Option A: Make supplierId Optional (Recommended)

Modify the `EstimatePDFUpload` component to work without requiring a `supplierId`. Since the supplier ID is only used when calling the edge function for parsing, we can:
1. Make the prop optional
2. Fetch the supplier ID inside the component OR pass it to the edge function differently
3. Show the upload button regardless

**Changes Required:**
- `src/components/estimate/EstimatePDFUpload.tsx` - Make `supplierId` optional, derive it from the estimate's supplier_org_id if needed
- `src/pages/SupplierProjectEstimates.tsx` - Remove the conditional wrapper around `EstimatePDFUpload`

### Option B: Ensure Supplier Record Exists (Data Fix)

Add logic to create a `suppliers` record automatically when a SUPPLIER organization is created, or create it on-demand when accessing the estimates page.

**Changes Required:**
- Add migration or trigger to auto-create supplier records
- OR add fallback creation logic in the page component

### Option C: Use Organization ID Instead of Supplier ID

The edge function could use `supplier_org_id` (which is already available on the estimate) instead of requiring a separate `suppliers` table lookup.

**Changes Required:**
- `supabase/functions/parse-estimate-pdf/index.ts` - Accept `supplier_org_id` instead of `supplier_id`
- `src/components/estimate/EstimatePDFUpload.tsx` - Pass organization ID instead

---

## Recommended Implementation: Option A + C Hybrid

1. **Remove the supplierId conditional** in `SupplierProjectEstimates.tsx` (line 639)
2. **Make supplierId optional** in `EstimatePDFUpload.tsx`
3. **Pass supplierOrgId** to the component (available from `selectedEstimate.supplier_org_id`)
4. **Update the edge function** to accept either `supplier_id` or `supplier_org_id`

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/SupplierProjectEstimates.tsx` | Remove `{supplierId && ...}` wrapper; pass `supplierOrgId` instead |
| `src/components/estimate/EstimatePDFUpload.tsx` | Accept `supplierOrgId` as optional prop; use it for edge function call |
| `supabase/functions/parse-estimate-pdf/index.ts` | Handle `supplier_org_id` as fallback for catalog matching |

### Code Changes

**SupplierProjectEstimates.tsx (lines 637-649):**
```typescript
// Before:
{supplierId && (
  <EstimatePDFUpload
    estimateId={selectedEstimate.id}
    supplierId={supplierId}
    ...
  />
)}

// After:
<EstimatePDFUpload
  estimateId={selectedEstimate.id}
  supplierOrgId={selectedEstimate.supplier_org_id}
  ...
/>
```

**EstimatePDFUpload.tsx:**
- Change prop from `supplierId: string` to `supplierOrgId: string`
- Update edge function call to pass `supplier_org_id` instead

**parse-estimate-pdf/index.ts:**
- Accept `supplier_org_id` parameter
- Look up catalog items by organization instead of supplier ID

---

## Technical Notes

The `suppliers` table is a legacy concept that may not always have records. The organization ID is more reliable since it's always available through the auth context. This change makes the system more robust and removes the dependency on the `suppliers` table for basic functionality.
