

# Fix: TC↔FC SOV Shows Same Items as GC↔TC + Add Select All

## Plain English Explanation

When you split scope between your team (TC) and your field crew (FC), the system saves which items belong to whom. But when generating the SOV for the FC contract, the system fails to identify it as an FC contract because different parts of the code create the contract with different role labels — one says "from: Field Crew, to: Trade Contractor" and another says "from: Trade Contractor, to: Field Crew." The SOV generator only checks one pattern, so it misses the other and treats the FC contract like a regular TC contract, giving it all the same items.

Additionally, the SOV version numbering is shared across all contracts, so the FC's first SOV might be labeled "v6" instead of "v1."

## Bug 1: FC contract detection is broken

**File: `supabase/functions/generate-sov/index.ts`** — Lines 66-73

The edge function checks `from_role === 'Field Crew'` to identify FC contracts. But contracts are created two different ways:
- `DownstreamContractsCard`: `from_role='Field Crew'`, `to_role='Trade Contractor'`
- `useProjectFinancials`: `from_role='Trade Contractor'`, `to_role='Field Crew'`

So when the contract was created via the second path, `from_role` is `'Trade Contractor'` and the check fails. The filter then looks for `assigned_role = 'Trade Contractor'` items — which are all the non-FC items — producing the same SOV as GC↔TC.

**Fix**: Check both roles:
```ts
const isFCContract = fullContract?.from_role === 'Field Crew' || fullContract?.to_role === 'Field Crew';
```

Also select `to_role` in the query (currently only selects `from_role`).

## Bug 2: Version numbering is project-wide, not per-contract

**File: `supabase/functions/generate-sov/index.ts`** — Line 233

The version query doesn't filter by `contract_id`, so TC↔FC SOV v1 gets numbered as v6 if there are 5 GC↔TC versions.

**Fix**: Add `.eq("contract_id", contract.id)` to the version query.

## Bug 3: GC↔TC SOV gets wrongly filtered when assignments exist

When generating the GC↔TC SOV and scope assignments exist, the filter keeps only `assigned_role = 'Trade Contractor'` items, excluding FC-assigned items. But the GC↔TC contract covers ALL work — GC doesn't care about TC's internal splits.

**Fix**: Only apply the assignment filter for FC contracts (when `isFCContract` is true). For non-FC contracts, skip filtering entirely.

## Feature: Select All button in Scope Split dialog

**File: `src/components/project/ScopeSplitCard.tsx`**

Add a "Select All / Deselect All" toggle button above the item list in the dialog. When clicked, it either adds all active item IDs to `fcAssignments` or clears the set.

## Files changed

| File | Change |
|------|--------|
| `supabase/functions/generate-sov/index.ts` | Fix FC contract detection (check both roles), fix version numbering (filter by contract_id), only filter scope for FC contracts; redeploy |
| `src/components/project/ScopeSplitCard.tsx` | Add Select All / Deselect All button in the split dialog |

