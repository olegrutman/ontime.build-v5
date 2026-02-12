
# Fix: TC Dashboard Revenue/Cost Direction is Swapped

## Root Cause
In `useDashboardData.ts`, the contract direction logic for TC financials is backwards:

```
Current (WRONG):
  to_org_id === TC  --> counted as Revenue  (but these are FC billing TC = COSTS)
  from_org_id === TC --> counted as Costs   (but these are TC billing GC = REVENUE)
```

The contract model uses `from_org_id` = Contractor (invoice sender) and `to_org_id` = Client (payer). So for TC:
- **Revenue**: contracts where `from_org_id === TC` (TC bills GC) -- currently $750K + $3.25K
- **Costs**: contracts where `to_org_id === TC` (FC bills TC) -- currently $650K + $1.75K

The 655K you see is actually the FC cost contracts ($651,750) plus the work order value ($3,250), incorrectly summed as revenue.

## Fix

### File: `src/hooks/useDashboardData.ts`

Swap the direction check on lines 512-518:

**Before:**
```typescript
contracts.forEach(c => {
  if (c.to_org_id === currentOrg.id) {
    totalRevenue += c.contract_sum || 0;
  }
  if (c.from_org_id === currentOrg.id) {
    totalCosts += c.contract_sum || 0;
  }
});
```

**After:**
```typescript
contracts.forEach(c => {
  if (c.from_org_id === currentOrg.id) {
    totalRevenue += c.contract_sum || 0;
  }
  if (c.to_org_id === currentOrg.id) {
    totalCosts += c.contract_sum || 0;
  }
});
```

### Expected Result After Fix
- **Total Revenue**: $750,000 + $3,250 (contracts) + $3,250 (work order) = $756,500
- **Total Costs**: $650,000 + $1,750 (contracts) + FC labor from work orders
- **Profit**: Revenue - Costs (now correct)

### Files Modified
- `src/hooks/useDashboardData.ts` -- swap from/to direction in TC contract revenue/cost calculation
