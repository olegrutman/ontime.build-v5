

# Fix: TC Can't See GC↔TC SOV — Stale Prerequisites Cache

## Root Cause

In `src/hooks/useSOVPage.ts`, the `prereqs` query has a **stale closure** bug:

1. Hook receives `contractId` from the page
2. `activeContractId = contractId` (set immediately)
3. `activeContract = allContracts.find(c => c.id === activeContractId)` — returns `undefined` until `allContracts` query resolves
4. `prereqs` query runs with `hasContract: !!activeContract?.contract_sum` → **false** (because `activeContract` is still null)
5. When `allContracts` loads, `activeContract` gets a value, but the query key `['sov-prereqs', projectId, activeContractId]` **hasn't changed** — so the query doesn't re-fetch
6. Result: `hasContract` stays `false`, the SOV table is hidden behind "Prerequisites required — Create a contract"

This affects TC viewing the GC↔TC SOV because the page's `allContracts` query and the hook's `allContracts` query use the same cache key, but there's still a render cycle where the hook's `allContracts` is empty.

## Fix

**File: `src/hooks/useSOVPage.ts`**

1. Add `activeContract?.id` to the prereqs query key so it re-fetches when the contract object becomes available:

```ts
queryKey: ['sov-prereqs', projectId, activeContractId, activeContract?.id],
```

2. Alternatively (more robust), disable the prereqs query until `activeContract` is available when a `contractId` is passed:

```ts
enabled: !!projectId && (!contractId || !!activeContract),
```

Both changes together ensure the prereqs query always reflects the actual contract data.

## Files changed

| File | Change |
|------|--------|
| `src/hooks/useSOVPage.ts` | Fix prereqs query key and enabled condition to prevent stale `hasContract: false` |

