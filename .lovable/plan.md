

# Fix: Upload SOV button does nothing

## Problem
`selectedContractId` is initialized in `useState(contracts.length === 1 ? contracts[0].id : '')`. This only runs once on mount. If `contracts` is empty at mount time (async loading) or changes later, `selectedContractId` stays `''`. The `handleUpload` guard `if (!file || !selectedContractId || !selectedContract) return` silently aborts.

## Fix

**`src/components/sov/UploadSOVDialog.tsx`**: Add a `useEffect` to sync `selectedContractId` when `contracts` changes:

```typescript
useEffect(() => {
  if (!selectedContractId && contracts.length === 1) {
    setSelectedContractId(contracts[0].id);
  }
}, [contracts, selectedContractId]);
```

This ensures that when contracts load asynchronously or the prop updates, the single-contract auto-selection still works.

### Files to modify
| File | Change |
|------|--------|
| `src/components/sov/UploadSOVDialog.tsx` | Add `useEffect` to sync `selectedContractId` when `contracts` prop changes |

