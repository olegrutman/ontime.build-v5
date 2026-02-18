

# Fix: "Only the payer organization" Error Still Appearing

## Root Cause
The previous update correctly added the `isProjectCreator` bypass to `contractsMissingSOVs` and `createAllSOVs`, but missed a third location: the `createSOVForContract` function (used when creating an SOV for a single contract).

Line 609 in `src/hooks/useContractSOV.ts` still has:
```
if (contract.to_org_id !== currentOrgId) {
  // shows "Only the payer organization can create an SOV" error
}
```

## Fix

### `src/hooks/useContractSOV.ts` -- line 609

Change the payer check to also allow the project creator:

**Before:**
```
if (contract.to_org_id !== currentOrgId) {
```

**After:**
```
if (contract.to_org_id !== currentOrgId && !isProjectCreator) {
```

This is a one-line change. The `isProjectCreator` state variable is already being set correctly earlier in the hook.

