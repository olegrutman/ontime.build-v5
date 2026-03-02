

# Remove Redundant Materials Cards

## What's Being Removed

1. **MaterialsBudgetStatusCard** — The clickable card on the GC/TC overview page (rendered in `ProjectHome.tsx`)
2. **SupplierMaterialsControlCard** — Exported but not used on any page; dead code

## Changes

### `src/pages/ProjectHome.tsx`
- Remove the import of `MaterialsBudgetStatusCard` (line 36)
- Remove the conditional render block (lines 274-282) that displays the card

### `src/components/project/index.ts`
- Remove export for `MaterialsBudgetStatusCard` (line 37)
- Remove export for `SupplierMaterialsControlCard` (line 33)

### Files to Delete
- `src/components/project/MaterialsBudgetStatusCard.tsx`
- `src/components/project/SupplierMaterialsControlCard.tsx`
- `src/hooks/useMaterialsBudgetHealth.ts` (only used by MaterialsBudgetStatusCard)

