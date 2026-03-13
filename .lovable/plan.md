

# Highlight Ordered Packs in Estimate Catalog Card

## What Changes

The pack tags in the "Estimates → Orders" card currently all look the same. We'll visually distinguish which packs have already been ordered by checking if any PO references that estimate + pack name.

## Plan

### 1. Add `source_pack_name` to PO fetch (hook)
**File:** `src/hooks/useSupplierDashboardData.ts` (line 183)
- Add `source_pack_name` to the PO select query.

### 2. Build ordered packs set and pass to EstimateRow
**File:** `src/hooks/useSupplierDashboardData.ts` (lines 58-68, 420-446)
- Add `orderedPackNames: string[]` to the `EstimateRow` interface.
- After building `orderedByEstimate`, also build `orderedPacksByEstimate: Record<string, Set<string>>` by checking each PO's `source_estimate_id` + `source_pack_name` (where status is not ACTIVE/DRAFT).
- Include `orderedPackNames` in the mapped estimate rows.

### 3. Style ordered packs differently in the card
**File:** `src/components/dashboard/supplier/SupplierEstimateCatalog.tsx` (lines 56-66)
- Check if pack name is in `est.orderedPackNames`.
- Ordered packs get a green/check style (e.g., `bg-emerald-100 text-emerald-700` with a small checkmark icon).
- Unordered packs keep the current neutral style.

### Files Changed

| File | Change |
|---|---|
| `src/hooks/useSupplierDashboardData.ts` | Add `source_pack_name` to PO query; add `orderedPackNames` to `EstimateRow`; compute which packs are ordered |
| `src/components/dashboard/supplier/SupplierEstimateCatalog.tsx` | Visually distinguish ordered vs unordered pack tags |

