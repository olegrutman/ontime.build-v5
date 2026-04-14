

# Fix: TC Sees Material Prices When GC Is Responsible

## Root Cause

The `useCOResponsibility` hook has a query bug. It fetches from `project_contracts` with `.limit(1).maybeSingle()` but does **not** filter out rows where `material_responsibility` is null.

This project has two contracts:
- TC → GC contract: `material_responsibility = 'GC'`
- FC → TC contract: `material_responsibility = null`

When the FC → TC contract is returned first, the hook defaults `materialResponsible` to `'TC'`. This makes `showPricingColumns = true` for the TC user, exposing unit prices in both the CO materials table and the Add Material product picker.

The `PurchaseOrdersTab` does this correctly — it filters with `.not('material_responsibility', 'is', null)` before `.limit(1)`. The CO hook is missing that filter.

## Fix

### File: `src/hooks/useCOResponsibility.ts` (line 30-33)

Add the missing null filter to the query:

```typescript
// Before (buggy):
.from('project_contracts')
.select('material_responsibility')
.eq('project_id', projectId!)
.limit(1)
.maybeSingle();

// After (fixed):
.from('project_contracts')
.select('material_responsibility')
.eq('project_id', projectId!)
.not('material_responsibility', 'is', null)
.limit(1)
.maybeSingle();
```

This single-line change ensures the hook only picks up contracts where material responsibility was explicitly set, matching the behavior in `PurchaseOrdersTab`, `OverviewTeamCard`, `TeamMembersCard`, `TCProjectOverview`, and `ProjectOverviewTeamCard` — all of which already filter for non-null.

### No other files need changes

- The `showPricingColumns` logic in `COMaterialsPanel.tsx` (line 146) is already correct: `isTC && materialsResponsible === 'TC'` — it just needs the correct value.
- The `hidePricing` prop on `ProductPickerContent` was already fixed to `!showPricingColumns` in the previous pass.
- The `QuantityPanel` line total display is properly gated by `!hidePricing`.
- No database or RLS changes needed.

