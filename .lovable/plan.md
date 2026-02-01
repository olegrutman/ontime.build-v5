
# Plan: SOV Gating and Edit Lock Rules

## Overview
Implement a robust SOV workflow that:
1. **Gates transactions** until all primary contract SOVs are created and locked
2. **Allows SOV editing** until the first invoice is submitted (not just created) for approval

---

## Current Issues

1. **TC can create work orders before SOVs exist** - This bypasses the intended workflow where SOVs should be set up first
2. **No enforcement of SOV completion** - Users can proceed with transactions without properly configuring billing structure
3. **Lock timing is wrong** - Currently locks on manual action, but should remain editable until first invoice submission

---

## Solution Design

### Concept: SOV Readiness Check

Create a centralized check that answers: "Are all primary contracts ready for billing?"

**Conditions for SOV Readiness:**
- All primary contracts (non-work-order) with `contract_sum > 0` must have an SOV
- Each SOV must be locked (`is_locked = true`)

### Concept: SOV Edit Window

SOV editing should be allowed until the SOV has active billing:
- **Editable**: No invoices with status SUBMITTED, APPROVED, or PAID exist for this SOV
- **Locked from editing**: First invoice submitted for approval

---

## Implementation Details

### 1. Create SOV Readiness Hook

**New file: `src/hooks/useSOVReadiness.ts`**

```typescript
interface SOVReadiness {
  isReady: boolean;            // All SOVs created and locked
  pendingContracts: number;    // Contracts without SOVs
  unlockedSOVs: number;        // SOVs not yet locked
  loading: boolean;
  message: string;             // User-friendly status message
}
```

Logic:
- Fetch all primary contracts with `contract_sum > 0` (excluding Work Order trades)
- Fetch all SOVs for the project
- Check if each qualifying contract has a corresponding locked SOV
- Return readiness status

### 2. Block Work Order Creation Until SOVs Ready

**Modify: `src/components/project/WorkOrdersTab.tsx`**

- Import and use `useSOVReadiness` hook
- When `!isReady`, show an alert banner explaining SOVs must be set up first
- Disable or hide the "New Work Order" button with tooltip explaining why
- Link to the SOV tab for easy navigation

```
+----------------------------------------------------------+
|  ⚠️ SOV Setup Required                                   |
|  Create and lock Schedule of Values for all contracts    |
|  before creating work orders.                            |
|  [Go to SOV Tab]                                         |
+----------------------------------------------------------+
```

### 3. Block Invoice Creation Until SOVs Ready

**Modify: `src/components/invoices/InvoicesTab.tsx`**

- Import and use `useSOVReadiness` hook
- When `!isReady`, disable "New Invoice" button
- Show informational alert about SOV requirement

### 4. Update SOV Edit Lock Logic

**Modify: `src/hooks/useContractSOV.ts`**

Add a function to check if an SOV has submitted invoices:

```typescript
const hasSubmittedInvoices = useCallback(async (sovId: string) => {
  const { data } = await supabase
    .from('invoices')
    .select('id')
    .eq('sov_id', sovId)
    .in('status', ['SUBMITTED', 'APPROVED', 'PAID'])
    .limit(1);
  return (data && data.length > 0);
}, []);
```

### 5. Update SOV Editor UI

**Modify: `src/components/sov/ContractSOVEditor.tsx`**

For each SOV, check if it has submitted invoices:
- If yes: Show "Billing Active" badge, disable all editing (items, percentages, lock toggle)
- If no: Allow editing even if previously locked (can unlock to edit)

Replace current lock logic with invoice-based lock:

| Has Submitted Invoices? | UI State |
|------------------------|----------|
| No | Editable - can add/edit/delete items, adjust percentages |
| Yes | Locked - show "Billing Active" indicator, all editing disabled |

### 6. Remove Manual Lock Requirement for Billing

The lock button becomes optional for workflow organization but billing-based lock is automatic:
- **Manual Lock**: User can still lock early if they want to signify "this SOV is finalized"
- **Automatic Lock**: Once first invoice is submitted, editing is disabled regardless of manual lock state

---

## UI Changes Summary

### WorkOrdersTab
- Add alert banner when SOVs not ready
- Disable "New Work Order" button with explanation

### InvoicesTab  
- Disable "New Invoice" button when SOVs not ready
- Show guidance message

### ContractSOVEditor
- Show "Billing Active" badge on SOVs with submitted invoices
- Disable editing for SOVs with submitted invoices
- Update empty state to clarify SOV must be created before transactions

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useSOVReadiness.ts` | New hook for SOV readiness check |
| `src/components/project/WorkOrdersTab.tsx` | Add SOV readiness gate |
| `src/components/invoices/InvoicesTab.tsx` | Add SOV readiness gate |
| `src/hooks/useContractSOV.ts` | Add invoice check for edit lock |
| `src/components/sov/ContractSOVEditor.tsx` | Update UI for billing-based lock |

---

## Edge Cases Handled

1. **No primary contracts** - SOV readiness returns true (nothing to configure)
2. **All contracts are $0** - SOV readiness returns true (no billing needed)
3. **Work order contracts** - Excluded from primary SOV check (they get SOVs on finalization)
4. **Invoice in DRAFT status** - Does NOT lock the SOV (can still edit)
5. **Invoice REJECTED** - SOV remains editable (can fix and resubmit)
6. **Multiple invoices** - Any SUBMITTED/APPROVED/PAID locks the SOV

---

## Testing Checklist

1. Create a project with a TC → GC contract
2. Verify "New Work Order" is disabled before SOV creation
3. Create SOV from template
4. Verify "New Work Order" is still disabled (SOV not locked)
5. Lock the SOV to 100%
6. Verify "New Work Order" is now enabled
7. Create a work order
8. Create an invoice in DRAFT status
9. Verify SOV items are still editable
10. Submit the invoice for approval
11. Verify SOV items are now locked with "Billing Active" indicator
12. Verify unlock button is hidden/disabled for SOVs with billing
