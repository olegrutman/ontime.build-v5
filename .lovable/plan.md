

# Fix TeamMembersCard Contract Bug + Layout Issues

## Bug 1: Wrong contract fetched for material responsibility (CRITICAL)

The `fetchContract` function in `TeamMembersCard.tsx` uses `from_role = 'Trade Contractor'` with `limit(1)`, which returns the first work-order-level contract (material_responsibility: null) instead of the primary contract (material_responsibility: "TC").

**Fix in `TeamMembersCard.tsx`**: Change the query to exclude work-order contracts, matching the primary contract detection logic used in `useProjectFinancials.ts`:

```typescript
const { data } = await supabase
  .from('project_contracts')
  .select('id, material_responsibility, from_org_id, to_org_id')
  .eq('project_id', projectId)
  .eq('from_role', 'Trade Contractor')
  .or('trade.is.null,trade.neq.Work Order')
  .limit(1);
```

If no contract matches that filter (e.g. all contracts have `trade = 'Work Order'`), fall back to checking any contract with a non-null `material_responsibility`.

## Bug 2: Layout wrapper `contents md:block`

Remove the `<div className="contents md:block">` wrapper around `BudgetTracking` in `ProjectHome.tsx` (line 284). It causes layout leaking on mobile. Replace with just `BudgetTracking` directly inside the grid cell.

## Bug 3: Dead FinancialSnapshot export

Check if `src/components/project/FinancialSnapshot.tsx` still exists. If so, delete it and remove the export from `index.ts` line 28. If it was already deleted, just remove the export line.

## Files Modified

1. **`src/components/project/TeamMembersCard.tsx`** -- Fix the contract query to target the primary contract (trade IS NULL or trade != 'Work Order')
2. **`src/pages/ProjectHome.tsx`** -- Remove the `contents md:block` wrapper div
3. **`src/components/project/index.ts`** -- Remove dead `FinancialSnapshot` export if the file no longer exists

