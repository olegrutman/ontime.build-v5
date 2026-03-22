

# Fix: Total Contract Value Shows Wrong Amount on Scope & Details Tab

## Bug

`ScopeDetailsTab.tsx` line 90 sums **all** `project_contracts` rows for the project. This includes work orders, FC→TC contracts, and the main GC↔TC contract. The displayed value is $3,465,010 when it should be $650,000.

## Root Cause

The query on line 27-33 fetches all contracts without filtering, and line 90 sums them all:
```ts
const totalContractValue = contracts?.reduce((sum, c) => sum + (Number(c.contract_sum) || 0), 0) || 0;
```

## Fix

**File: `src/components/project/ScopeDetailsTab.tsx`**

1. Update the contracts query to also fetch `from_role`, `to_role`, and `trade`
2. Filter to only the primary contract: `from_role = 'Trade Contractor' AND to_role = 'General Contractor' AND trade NOT IN ('Work Order', 'Work Order Labor')`
3. Use the filtered contract's `contract_sum` directly instead of summing all contracts
4. Show the primary contract's retainage directly instead of averaging all contracts

The primary contract is the GC↔TC "Framer" contract — the one entered in the Contracts setup page. This matches how `useProjectFinancials` identifies `upstreamContract`.

## Files changed

| File | Change |
|------|--------|
| `src/components/project/ScopeDetailsTab.tsx` | Filter contracts query to primary GC↔TC contract only, use its value directly |

