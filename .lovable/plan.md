

# Fix FC Contract Save — 3 Bugs

## What's broken

1. **INSERT fails**: The insert statement includes `direction: 'downstream'` but that column doesn't exist on `project_contracts`. The error is caught and shown as a generic toast, but the real cause is hidden.

2. **UPDATE result ignored**: When the contract already exists (sum = $0), `updateContract()` is called but its return value is never checked. `setFcDirty(false)` runs unconditionally, making it look saved. On page refresh, the value reverts to $0.

3. **Org direction inconsistency**: `saveFcContract` puts FC as `from_org_id`, but `createFcContract` in `useProjectFinancials` puts TC as `from_org_id`. This mismatch can create duplicate contracts.

## Fix — `TCProjectOverview.tsx`

### Remove `direction` from INSERT (line ~349)
Delete the `direction: 'downstream'` property from the insert object. It's not a real column.

### Align org direction with `createFcContract`
Change the INSERT to match the convention used in `useProjectFinancials`:
- `from_org_id: currentOrgId` (TC — the one creating the contract)
- `to_org_id: targetOrg.org_id` (FC — the one receiving)
- `from_role: 'Trade Contractor'`
- `to_role: 'Field Crew'`

### Check `updateContract` return value
Wrap the update call to throw on failure:
```
const ok = await financials.updateContract(fcContract.id, newVal, fcContract.retainage_percent);
if (!ok) throw new Error('Failed to update contract');
```

This ensures the catch block fires and shows the error toast instead of silently proceeding.

## Files changed
- `src/components/project/TCProjectOverview.tsx` — fix all 3 bugs in `saveFcContract` (~10 lines changed)

## What stays the same
- `useProjectFinancials.ts` — no changes
- Database schema — no changes
- RLS policies — no changes

