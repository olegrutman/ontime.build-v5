

# Fix: Materials Priced Not Showing on Ready Card

## Problem
Work Order "RFI 87" has a linked PO with status `ORDERED` (materials are priced), but the "Ready for Approval" checklist shows "Materials priced" as incomplete. Two root causes:

1. **Database**: The sync trigger was created after the PO was already ORDERED, so `materials_priced` is still `false` in the checklist table. Need to backfill.
2. **UI Logic**: The checklist component only considers `materialsPricingLocked` and `checklist.materials_priced` -- it does not check if the linked PO is already in a priced state (PRICED, ORDERED, etc.). Additionally, the `completedCount` counter doesn't use `effectiveMaterialsPriced`, so even when the individual item shows green, the count is wrong.
3. **ApprovalPanel**: Same issue -- `isChecklistComplete` reads `checklist.materials_priced` directly without considering PO status.

## Fix

### 1. Database: Backfill existing data
Run a one-time migration to set `materials_priced = true` for any work order whose linked PO is already in a priced state:

```sql
UPDATE change_order_checklist cl
SET materials_priced = true, updated_at = now()
FROM change_order_projects co
JOIN purchase_orders po ON po.id = co.linked_po_id
WHERE cl.change_order_id = co.id
  AND po.status IN ('PRICED','ORDERED','FINALIZED','READY_FOR_DELIVERY','DELIVERED')
  AND cl.materials_priced = false;
```

### 2. UI: Pass linked PO status to checklist component
In `ChangeOrderDetailPage.tsx`, compute whether materials are effectively priced based on PO status and pass it down:

- Add a prop `linkedPOIsPriced` to `ChangeOrderChecklist`
- Compute it in the detail page from the linked PO data already available
- Update `effectiveMaterialsPriced` to: `materialsPricingLocked || linkedPOIsPriced || checklist.materials_priced`

### 3. Fix completedCount in ChangeOrderChecklist
Update the `completedCount` calculation to use `effectiveMaterialsPriced` for the `materials_priced` key instead of reading raw checklist data.

### 4. Fix ApprovalPanel isChecklistComplete
Pass the same `linkedPOIsPriced` prop and use it in the materials check:
```
const materialsComplete = !changeOrder.requires_materials || linkedPOIsPriced || (checklist.materials_priced ?? false);
```

## Files Changed

| File | Change |
|------|--------|
| SQL migration | Backfill `materials_priced` for existing work orders |
| `ChangeOrderDetailPage.tsx` | Compute `linkedPOIsPriced` and pass to checklist + approval |
| `ChangeOrderChecklist.tsx` | Add `linkedPOIsPriced` prop, fix `completedCount` |
| `ApprovalPanel.tsx` | Add `linkedPOIsPriced` prop, fix `isChecklistComplete` |

