

# Fix: TC Can't See Contract Data or SOV on Overview

## Root Cause
The upstream contract (TC→GC, $250K) has `from_org_id = NULL`. The RLS policy on `project_contracts` only allows access when the user's org matches `from_org_id` or `to_org_id`. Since the TC's org (`ab07e031`) isn't in either column, the query returns empty -- no contract, no SOV, no financial data.

The SOV is linked to this same contract (`contract_id = 1df26679`), so it's also invisible to the TC.

## Fix

### 1. DB Migration: Repair the broken contract data
Update the upstream contract's `from_org_id` to the TC's org id. This is a one-time data repair for legacy records created before the org_id fix was deployed.

```sql
UPDATE project_contracts
SET from_org_id = 'ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6'
WHERE id = '1df26679-8a06-4c72-911d-95b15e4e6726'
  AND from_org_id IS NULL;
```

### 2. DB Migration: Add a safety trigger to prevent future NULL org_ids
Create a trigger on `project_contracts` that auto-resolves `from_org_id` or `to_org_id` from `project_team` when they are inserted as NULL. This prevents recurrence.

### Expected Outcome
Once `from_org_id` is set, the existing RLS policy will grant the TC access to the contract. The `useProjectFinancials` hook will then return the upstream contract data, and the TC overview will show:
- Contract value ($250K)
- SOV items (linked to that contract)
- Margin calculations
- All KPI cards populated with real data

| Change | Detail |
|--------|--------|
| DB Migration | Set `from_org_id` on the broken contract + add safety trigger for future inserts |

No UI code changes needed -- the TC overview already has all the rendering logic, it's just not receiving data due to the RLS block.

