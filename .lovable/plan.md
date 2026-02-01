
# Plan: Fix SOV Readiness to Account for Billing Activity

## Problem Analysis

The SOV warning on the Work Orders tab persists even though SOVs are functionally locked through billing activity. The current issue:

1. **SOV Editor UI**: Shows "Billing Active" label when invoices exist (SUBMITTED/APPROVED/PAID), treating the SOV as locked for editing
2. **SOV Readiness Hook**: Only checks the `is_locked` boolean flag, ignoring the billing activity state

This causes a mismatch where:
- The database shows `is_locked: false` for a contract with active billing
- The UI shows "Billing Active" on the SOV
- The Work Orders tab incorrectly blocks new work order creation

### Current Database State
| Contract | Trade | is_locked | Has Billing |
|----------|-------|-----------|-------------|
| TC_Test → GC_Test | NULL (Primary) | false | Yes (1 invoice) |
| FC_Test → TC_Test | Framer | false | No |

---

## Solution

Update `useSOVReadiness.ts` to also fetch billing activity status and consider an SOV as "ready" if EITHER:
- `is_locked = true`, OR
- The SOV has at least one invoice in SUBMITTED, APPROVED, or PAID status (billing has begun)

This aligns the Work Orders gate with the same logic used by the SOV Editor UI.

---

## Implementation Details

### Update useSOVReadiness.ts

Modify the data fetch to include billing activity:

```typescript
interface SOV {
  id: string;
  contract_id: string | null;
  is_locked: boolean;
  has_billing: boolean; // NEW: true if invoices exist
}
```

Fetch billing status using a subquery or join:

```typescript
const sovsResult = await supabase
  .from('project_sov')
  .select(`
    id, 
    contract_id, 
    is_locked,
    invoices:project_contracts!contract_id(
      invoices!inner(id, status)
    )
  `)
  .eq('project_id', projectId);
```

Alternative approach - use a separate query for simplicity:

```typescript
// Fetch invoices with billing activity for this project
const invoicesResult = await supabase
  .from('invoices')
  .select('contract_id')
  .eq('project_id', projectId)
  .in('status', ['SUBMITTED', 'APPROVED', 'PAID']);

const contractsWithBilling = new Set(
  invoicesResult.data?.map(i => i.contract_id).filter(Boolean) || []
);
```

Then update the unlocked check:

```typescript
// Check which SOVs are unlocked (and have no billing activity)
const unlockedSOVs = sovs.filter(
  s => !s.is_locked && 
       !contractsWithBilling.has(s.contract_id) && 
       primaryContracts.some(c => c.id === s.contract_id)
);
```

---

## File Changes

| File | Change |
|------|--------|
| `src/hooks/useSOVReadiness.ts` | Add billing activity check to the readiness logic |

---

## Technical Details

### Modified Query Strategy

Option 1 (Recommended - Separate query for clarity):
```typescript
const [contractsResult, sovsResult, billingResult] = await Promise.all([
  supabase
    .from('project_contracts')
    .select('id, contract_sum, trade')
    .eq('project_id', projectId),
  supabase
    .from('project_sov')
    .select('id, contract_id, is_locked')
    .eq('project_id', projectId),
  supabase
    .from('invoices')
    .select('contract_id')
    .eq('project_id', projectId)
    .in('status', ['SUBMITTED', 'APPROVED', 'PAID'])
]);

const contractsWithBilling = new Set(
  billingResult.data?.map(i => i.contract_id).filter(Boolean) || []
);
```

### Updated Readiness Logic

```typescript
// Check which SOVs are unlocked AND have no billing activity
const unlockedSOVs = sovs.filter(
  s => !s.is_locked && 
       !contractsWithBilling.has(s.contract_id) && 
       primaryContracts.some(c => c.id === s.contract_id)
);
```

This means an SOV is considered "ready" if:
- It has `is_locked = true`, OR
- It has billing activity (invoices in SUBMITTED/APPROVED/PAID status)

---

## Expected Results

After implementation:
1. SOVs with billing activity will no longer show as "unlocked" in the readiness check
2. The warning will disappear when all primary contract SOVs are either:
   - Manually locked (`is_locked = true`), OR
   - Have active billing (invoices submitted/approved/paid)
3. The New Work Order button will become enabled

---

## Testing Checklist

1. Verify SOVs with `is_locked = true` and no billing are considered ready
2. Verify SOVs with `is_locked = false` but with billing are considered ready
3. Verify SOVs with `is_locked = false` and no billing still show the warning
4. Test that locking an SOV via the UI dismisses the warning
5. Test that submitting an invoice against an unlocked SOV also dismisses the warning
