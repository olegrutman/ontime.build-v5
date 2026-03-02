

# Simplify PO Statuses: Remove FINALIZED and READY_FOR_DELIVERY

## Analysis

Current 7 statuses create two competing workflows:

```text
Path A: ACTIVE -> SUBMITTED -> PRICED -> ORDERED -> DELIVERED
Path B: ACTIVE -> SUBMITTED -> PRICED -> FINALIZED -> READY_FOR_DELIVERY -> DELIVERED
```

Path B adds two extra steps (FINALIZED and READY_FOR_DELIVERY) that don't provide meaningful value over Path A:
- **FINALIZED** = "GC approved the pricing" -- but the GC already approved by creating/submitting the PO. If the supplier priced it, the next logical step is ordering, not a separate "finalize" gate.
- **READY_FOR_DELIVERY** = "Supplier says materials are ready to ship" -- this is essentially the same as ORDERED. Once it's ordered, the next meaningful event is delivery.

**Database confirms this:** No POs are in ACTIVE, PRICED, or READY_FOR_DELIVERY. The 2 FINALIZED POs can be migrated to ORDERED.

## Proposed Clean Flow (5 statuses)

```text
ACTIVE -> SUBMITTED -> PRICED -> ORDERED -> DELIVERED
  (draft)   (sent to     (supplier   (order     (materials
             supplier)    set prices)  placed)    received)
```

## Changes

### 1. Database migration: Move existing FINALIZED POs to ORDERED

Update the 2 FINALIZED POs to ORDERED status. No READY_FOR_DELIVERY POs exist, so no migration needed for those.

### 2. Update type definitions

**File:** `src/types/purchaseOrder.ts`
- Remove FINALIZED and READY_FOR_DELIVERY from the `POStatus` type
- Remove their entries from `PO_STATUS_LABELS` and `PO_STATUS_COLORS`

### 3. Update PODetail action buttons

**File:** `src/components/purchase-orders/PODetail.tsx`
- Remove the "Finalize Order" button (PRICED status section)
- Remove the "Ready for Delivery" button and dialog (FINALIZED status section)
- Remove the READY_FOR_DELIVERY -> DELIVERED button block
- Remove `handleFinalize` and `handleMarkReadyForDelivery` functions
- Remove `readyDialogOpen`, `expectedDeliveryDate` state variables and the ready-for-delivery dialog
- Keep the ORDERED -> Mark Delivered flow (supplier marks delivered)

### 4. Update POCard

**File:** `src/components/purchase-orders/POCard.tsx`
- Remove the `ready_for_delivery_at` tracking display (only keep `delivered_at`)

### 5. Update references across the codebase

**Files with FINALIZED/READY_FOR_DELIVERY references:**
- `src/components/project/MetricStrip.tsx` -- remove from status filter arrays
- `src/components/project/POSummaryCard.tsx` -- remove from in-transit filter
- `src/components/project/SupplierMaterialsControlCard.tsx` -- remove from status list
- `src/components/project/SupplierEstimateVsOrdersCard.tsx` -- remove from status list
- `src/components/change-order-detail/WorkOrderMaterialsPanel.tsx` -- remove status entries
- `src/components/change-order-detail/ChangeOrderDetailPage.tsx` -- remove from priced PO status array
- `src/components/project/PurchaseOrdersTab.tsx` -- update sort priority array

### 6. Update PO sort priority

**File:** `src/components/project/PurchaseOrdersTab.tsx`
- Remove FINALIZED and READY_FOR_DELIVERY from the status priority sort order
- New order: ACTIVE, SUBMITTED, PRICED, ORDERED, DELIVERED

---

## Summary

| Status | Keep/Remove | Reason |
|--------|-------------|--------|
| ACTIVE | Keep | Draft state, needed for editing |
| SUBMITTED | Keep | Core workflow -- sent to supplier |
| PRICED | Keep | Supplier set prices |
| FINALIZED | **Remove** | Redundant gate between priced and ordered |
| ORDERED | Keep | Order placed with supplier |
| READY_FOR_DELIVERY | **Remove** | Overlaps with ORDERED, no POs use it |
| DELIVERED | Keep | Final state, materials received |

