

# Fix: Material Pricing Lock Not Available for ORDERED POs

## Problem
The "Lock Materials Pricing" button (which triggers `materials_priced` on the checklist) never appears for this work order because the linked PO has status `ORDERED`, which is not included in the `isPriced` check. The panel only considers `PRICED`, `FINALIZED`, `READY_FOR_DELIVERY`, and `DELIVERED` as "priced" statuses.

Since POs go through the flow: ACTIVE -> SUBMITTED -> PRICED -> ORDERED -> DELIVERED, once a PO is ordered it is definitely priced. The `ORDERED` status (and `FINALIZED`) should be treated as priced.

## Root Cause
In `WorkOrderMaterialsPanel.tsx` (line 66):
```typescript
const isPriced = linkedPO.status === 'PRICED' || linkedPO.status === 'FINALIZED' 
  || linkedPO.status === 'READY_FOR_DELIVERY' || linkedPO.status === 'DELIVERED';
```
Missing: `ORDERED`.

## Fix

### File: `src/components/change-order-detail/WorkOrderMaterialsPanel.tsx` (line 66)

Add `ORDERED` to the `isPriced` check and add it to the `STATUS_LABELS` map:

```typescript
const isPriced = linkedPO.status === 'PRICED' || linkedPO.status === 'ORDERED' 
  || linkedPO.status === 'FINALIZED' || linkedPO.status === 'READY_FOR_DELIVERY' 
  || linkedPO.status === 'DELIVERED';
```

Also add `ORDERED` to the `STATUS_LABELS` map (around line 42-49):
```typescript
ORDERED: { label: 'Ordered', variant: 'default' },
```

### File: `src/components/change-order-detail/TCPricingSummary.tsx` (line 68)

The same issue exists in `hasMaterialsPriced`:
```typescript
const hasMaterialsPriced = !requiresMaterials 
  || (linkedPO && linkedPO.status !== 'ACTIVE' && linkedPO.status !== 'SUBMITTED')
  || materials.every(m => m.unit_cost && m.unit_cost > 0);
```
This one is actually correct -- it uses a deny-list (not ACTIVE, not SUBMITTED), so ORDERED is already treated as priced here. No change needed.

## Summary
Single-file fix in `WorkOrderMaterialsPanel.tsx`: add `ORDERED` to `isPriced` and `STATUS_LABELS`. This will make the pricing section, markup editor, and "Lock Materials Pricing" button visible when the linked PO has been ordered.
