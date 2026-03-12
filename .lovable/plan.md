

# Dashboard Testing Report -- Issues Found

## Bugs Identified

### 1. Console Ref Warnings on Two Dialog Components
**Severity: Low (cosmetic)**
The console shows "Function components cannot be given refs" for `CompleteProjectDialog` and `AddReminderDialog`. These are function components that Radix's `AlertDialog`/`Dialog` internally tries to attach a ref to. The fix is straightforward: wrap both components with `React.forwardRef`.

**Files:** `CompleteProjectDialog.tsx`, `AddReminderDialog.tsx`

### 2. "To Collect" Only Counts APPROVED Invoices -- Misses SUBMITTED
**Severity: High (wrong numbers)**
In `useDashboardData.ts` line 460-464, `outstandingToCollect` only includes invoices with status `APPROVED`. For a TC/FC user, a SUBMITTED invoice is also money they're owed -- it just hasn't been approved yet. The current logic means a TC who submitted a $21,250 invoice sees "$0 To Collect" even though they're actively waiting on that money.

The fix: include both `SUBMITTED` and `APPROVED` invoices in the "To Collect" calculation for TC/FC roles. For GC, keep it APPROVED-only (GC "To Collect" means the owner owes them, which only applies after GC approves).

**File:** `useDashboardData.ts` lines 460-464

### 3. Financial Snapshot Shows "Contract Revenue: $0" When It Should Show Revenue
**Severity: Medium (misleading)**
The `DashboardFinancialSnapshot` component shows "Contract Revenue" for TC/FC using `financials.totalRevenue`. The calculation at line 511-519 sums contracts where `from_org_id === currentOrg.id`. If this shows $0 despite having contracts, the `from_org_id` may not match. However, the per-project hook (`useProjectQuickStats`) correctly shows budget = $150K for the same contract. This suggests either a data mismatch or the `contracts` array in `useDashboardData` doesn't include the same records. Need to verify -- but the logic path looks correct, so this may be a transient data state.

**File:** `useDashboardData.ts` -- verify `contracts` array includes the right records at line 512

## Fixes

### Fix 1: Forward refs on dialog components

Wrap `CompleteProjectDialog` and `AddReminderDialog` with `React.forwardRef` to silence the warnings.

### Fix 2: Expand "To Collect" to include SUBMITTED invoices

```typescript
// Line 460-464 in useDashboardData.ts
// BEFORE:
const invoicesToCollect = allInvoices.filter(i => {
  if (i.status !== 'APPROVED' || !i.contract_id) return false;
  ...
});

// AFTER:
const invoicesToCollect = allInvoices.filter(i => {
  if (!['SUBMITTED', 'APPROVED'].includes(i.status) || !i.contract_id) return false;
  const contract = contractDetailMap.get(i.contract_id);
  return contract?.from_org_id === currentOrg.id;
});
```

### Fix 3: Verify Contract Revenue calculation

Add a console log temporarily or trace the `contracts` array to confirm the TC's sent contracts are included. If the query at line 196-200 returns the right data, the calculation should work. If not, the query filter may need adjustment.

### Files to change:
| File | Change |
|------|--------|
| `src/components/dashboard/CompleteProjectDialog.tsx` | Wrap with `forwardRef` |
| `src/components/dashboard/AddReminderDialog.tsx` | Wrap with `forwardRef` |
| `src/hooks/useDashboardData.ts` | Expand "To Collect" filter to include SUBMITTED invoices |

