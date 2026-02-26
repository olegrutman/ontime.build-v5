

# Auto-trigger Materials Priced + Finalize Linked PO on Work Order Approval

## Problem
1. When a supplier prices a PO linked to a work order (PO status becomes PRICED or later), the checklist "Materials Priced" item does not automatically check off -- TC must manually click "Lock Materials Pricing"
2. When the GC finalizes/approves a work order, the linked PO stays in whatever status it was in (e.g. ORDERED) instead of being automatically finalized

## Solution

### 1. Database trigger: Auto-set `materials_priced` when linked PO reaches PRICED status

Create a new database trigger on `purchase_orders` that fires when a PO's status changes. If the PO is linked to a work order (via `change_order_projects.linked_po_id`) and the new status is PRICED, ORDERED, FINALIZED, READY_FOR_DELIVERY, or DELIVERED, it will:
- Set `materials_priced = true` on the corresponding `change_order_checklist` row
- This means the checklist item lights up automatically when the supplier prices the PO, without TC needing to do anything extra

```sql
CREATE OR REPLACE FUNCTION public.fn_sync_po_status_to_wo_checklist()
RETURNS trigger AS $$
DECLARE
  v_co_id UUID;
BEGIN
  -- Only act when status changes to a "priced" state
  IF NEW.status IN ('PRICED','ORDERED','FINALIZED','READY_FOR_DELIVERY','DELIVERED')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('PRICED','ORDERED','FINALIZED','READY_FOR_DELIVERY','DELIVERED'))
  THEN
    -- Find work order linked to this PO
    SELECT id INTO v_co_id
    FROM change_order_projects
    WHERE linked_po_id = NEW.id
    LIMIT 1;

    IF v_co_id IS NOT NULL THEN
      UPDATE change_order_checklist
      SET materials_priced = true, updated_at = now()
      WHERE change_order_id = v_co_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 2. Update existing `convert_change_order_to_contract` trigger: Finalize linked PO on approval

Modify the existing trigger function that fires when a work order is approved. Add logic at the end (before `NEW.status := 'contracted'`) to finalize the linked PO:

```sql
-- Inside convert_change_order_to_contract, after FC contract logic:
IF NEW.linked_po_id IS NOT NULL THEN
  UPDATE purchase_orders
  SET status = 'FINALIZED', updated_at = now()
  WHERE id = NEW.linked_po_id
    AND status NOT IN ('FINALIZED','READY_FOR_DELIVERY','DELIVERED');
END IF;
```

This ensures that when the GC clicks "Finalize Work Order", the linked material PO is also finalized automatically.

### 3. Frontend: Update ApprovalPanel finalize confirmation text

In `ApprovalPanel.tsx`, update the confirmation dialog bullet list to mention that the linked PO will also be finalized (if one exists):

```
- Finalize the linked material Purchase Order (if applicable)
```

## Technical Summary

| Change | Location |
|--------|----------|
| New DB trigger on `purchase_orders` status change to auto-set `materials_priced` on work order checklist | SQL migration |
| Update `convert_change_order_to_contract` to finalize linked PO on work order approval | SQL migration |
| Update finalize confirmation text | `src/components/change-order-detail/ApprovalPanel.tsx` |

