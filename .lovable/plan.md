

# Fix: PackSelector Shows "No Approved Estimate" Despite Approved Estimate Existing

## Root Cause

The estimate was uploaded using the **old flat CSV import** path in `SupplierProjectEstimates.tsx` (line 336-344). This path inserts items **without setting `pack_name`**, so all 119 items have `pack_name = NULL`.

The `PackSelector` component then queries items with `.not('pack_name', 'is', null)` (line 75), which filters out every single item. With zero items returned, it displays "No approved estimate found."

**The estimate itself is correctly approved** (status = APPROVED, approved_at is set). The problem is purely in item retrieval.

## Fix

### 1. `src/components/po-wizard-v2/PackSelector.tsx`

**Remove the `pack_name IS NOT NULL` filter.** Instead, fetch ALL items for the approved estimate and group them:
- Items WITH a `pack_name` get grouped into their respective packs as before
- Items WITHOUT a `pack_name` get grouped into an "Ungrouped Items" pack

This ensures estimates uploaded via both the old flat CSV import and the new pack-aware wizard are fully visible in the PO creation flow.

**Specific changes:**
- Line 75: Remove `.not('pack_name', 'is', null)` from the query
- Line 82: The existing fallback `item.pack_name || 'Ungrouped'` already handles null pack names correctly -- no change needed there

### 2. `src/pages/SupplierProjectEstimates.tsx`

**Fix the old CSV import to pass `pack_name` through when available.** The `CSVLineItem` interface and the `handleCsvImport` function both ignore `pack_name`. We should:
- Add `pack_name` to the `CSVLineItem` interface
- In the CSV parsing logic (lines 300-330), detect the `pack_name` column (same as the new parser does)
- Include `pack_name` in the items inserted at line 336-344

This prevents the issue from recurring for future flat CSV uploads.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/po-wizard-v2/PackSelector.tsx` | Remove `.not('pack_name', 'is', null)` filter on line 75 so items without pack names are included |
| `src/pages/SupplierProjectEstimates.tsx` | Add `pack_name` column detection to the old CSV import path and include it in the insert payload |

## Impact

- Estimates uploaded via the old CSV path will now appear as a single "Ungrouped Items" pack in the PO wizard
- Estimates uploaded via the new pack-aware wizard will continue to show individual named packs
- Future flat CSV uploads that happen to include a `pack_name` column will also group correctly
