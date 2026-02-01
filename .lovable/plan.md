
# Plan: Simplify SOV Workflow - Only Require SOV Existence, Auto-Lock on First Invoice

## Problem Summary

The current flow requires SOVs to be **both created AND locked** before allowing:
1. Work order creation
2. Invoice creation

The user wants to simplify this:
- SOVs only need to **exist** (be created) for work orders and invoices
- SOVs should be **auto-locked when the first invoice is created** against them

---

## Current State Analysis

### Files Using SOV Readiness Check
| File | Usage |
|------|-------|
| `src/hooks/useSOVReadiness.ts` | Central hook that checks if SOVs are ready |
| `src/components/project/WorkOrdersTab.tsx` | Blocks "New Work Order" button if not ready |
| `src/components/invoices/InvoicesTab.tsx` | Blocks "New Invoice" button if not ready |

### Current Readiness Logic in `useSOVReadiness.ts`
```typescript
// Currently requires:
// 1. All primary contracts have SOVs created
// 2. All those SOVs are locked OR have billing activity
const isReady = pendingContracts === 0 && unlockedCount === 0;
```

### Current Database State
SOVs have an `is_locked` boolean flag that is currently manually toggled by users.

---

## Solution

### Part 1: Change SOV Readiness Logic

Update `useSOVReadiness.ts` to only check if SOVs **exist** for primary contracts:
- Remove the check for `is_locked` status
- Remove the check for billing activity
- Ready = all primary contracts have SOVs created

### Part 2: Auto-Lock SOV on First Invoice

Create a database trigger that automatically sets `is_locked = true` when the first invoice is created for an SOV.

---

## File Changes

| File | Change |
|------|--------|
| `src/hooks/useSOVReadiness.ts` | Simplify readiness logic to only check SOV existence |
| `src/components/project/WorkOrdersTab.tsx` | Update tooltip text to reflect new requirement |
| `src/components/invoices/InvoicesTab.tsx` | Update tooltip text to reflect new requirement |
| Database migration | Add trigger to auto-lock SOV on first invoice creation |

---

## Implementation Details

### 1. Update useSOVReadiness.ts

**Remove:**
- The `unlockedSOVs` calculation
- The billing activity check
- The `unlockedSOVs` return field

**Simplified Logic:**
```typescript
// Only check if SOVs exist for all primary contracts
const contractsWithSOVs = new Set(sovs.map(s => s.contract_id).filter(Boolean));
const contractsWithoutSOVs = primaryContracts.filter(c => !contractsWithSOVs.has(c.id));
const pendingContracts = contractsWithoutSOVs.length;

// Ready if all primary contracts have SOVs
const isReady = pendingContracts === 0;

// Simplified message
let message = '';
if (isReady) {
  message = 'All SOVs are created.';
} else {
  message = `Create SOVs for ${pendingContracts} contract${pendingContracts > 1 ? 's' : ''} before creating work orders.`;
}
```

### 2. Update WorkOrdersTab.tsx

Update the tooltip:
```typescript
// Old: "Create and lock all SOVs first"
// New: "Create SOVs for all contracts first"
```

### 3. Update InvoicesTab.tsx

Same tooltip update.

### 4. Database Trigger for Auto-Lock

Create a trigger on the `invoices` table that:
1. Fires `AFTER INSERT`
2. Checks if this is the first invoice for the SOV
3. If yes, updates `project_sov.is_locked = true`

```sql
CREATE OR REPLACE FUNCTION auto_lock_sov_on_first_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if invoice has an sov_id
  IF NEW.sov_id IS NOT NULL THEN
    -- Check if this is the first invoice for this SOV
    -- (count of invoices for this SOV before this insert should be 0)
    IF NOT EXISTS (
      SELECT 1 FROM invoices 
      WHERE sov_id = NEW.sov_id 
        AND id != NEW.id
    ) THEN
      -- This is the first invoice - auto-lock the SOV
      UPDATE project_sov
      SET is_locked = true,
          locked_at = NOW(),
          locked_by = NEW.created_by
      WHERE id = NEW.sov_id
        AND is_locked = false;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_lock_sov_on_first_invoice
AFTER INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION auto_lock_sov_on_first_invoice();
```

---

## Interface Changes

### SOVReadiness Interface Update

```typescript
// Remove unlockedSOVs from the interface
interface SOVReadiness {
  isReady: boolean;
  pendingContracts: number;
  // REMOVED: unlockedSOVs: number;
  loading: boolean;
  message: string;
}
```

---

## Expected Behavior After Implementation

1. **Work Orders Tab:**
   - Warning only shows if primary contracts are missing SOVs
   - Once SOVs are created (regardless of lock status), work orders can be created

2. **Invoices Tab:**
   - Same behavior - only checks for SOV existence

3. **First Invoice Creation:**
   - When a user creates the first invoice for an SOV
   - Database trigger automatically sets `is_locked = true`
   - SOV becomes read-only (cannot add/remove/edit items)

4. **SOV Editor UI:**
   - Lock/unlock buttons still work for manual control
   - Once billing starts, the "Billing Active" badge shows and prevents editing

---

## Testing Checklist

1. Create a project with contracts but no SOVs
   - Work Orders tab should show warning
   - Invoice creation should be blocked

2. Create SOVs (without locking them)
   - Warning should disappear
   - Work orders and invoices can now be created

3. Create an invoice against an unlocked SOV
   - SOV should auto-lock after invoice is created
   - SOV Editor should show "Locked" badge

4. Verify existing locked SOVs still work correctly

5. Verify Work Order SOVs (trade = 'Work Order') are still excluded from the readiness check
