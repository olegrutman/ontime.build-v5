
# Plan: Mark Materials Priced When Locking Materials Pricing

## Problem

When the Trade Contractor locks materials pricing on the work order page (via the "Lock Materials Pricing" button), the system:
- Sets `materials_pricing_locked = true` on `change_order_projects`
- Shows "Materials pricing locked" indicator

But it does **not** update the `materials_priced` field in the `change_order_checklist` table, which means:
- The "Ready for Approval" checklist still shows "Materials priced" as incomplete
- This blocks the work order from being ready for approval

## Root Cause

The existing database trigger only watches the legacy `change_order_materials` table. The new work order flow uses linked Purchase Orders (`purchase_orders` + `po_line_items`) for material management, bypassing that trigger.

When materials pricing is locked, the checklist should be updated manually since the locking action serves as confirmation that all material pricing is finalized.

## Solution

Modify the `lockMaterialsPricingMutation` in the hook to also update the checklist's `materials_priced` field to `true` when locking materials pricing.

## Implementation

### File: `src/hooks/useChangeOrderProject.ts`

Update the `lockMaterialsPricingMutation` to:

1. Update `change_order_projects` with:
   - `materials_pricing_locked: true`
   - `materials_locked_at: timestamp`

2. Also update `change_order_checklist` with:
   - `materials_priced: true`

```text
Current behavior:
  UPDATE change_order_projects SET materials_pricing_locked = true ...

New behavior:
  UPDATE change_order_projects SET materials_pricing_locked = true ...
  UPDATE change_order_checklist SET materials_priced = true ...
```

### Changes Required

The mutation will execute two database updates:
1. Lock the pricing on `change_order_projects`
2. Mark `materials_priced = true` on `change_order_checklist`

Both queries use the same `changeOrderId`, so they can be executed sequentially or the checklist update can be added after the main update.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useChangeOrderProject.ts` | Add checklist update in `lockMaterialsPricingMutation` |

## Verification

After the change:
1. Open a work order with a linked, priced PO
2. Apply markup if desired
3. Click "Lock Materials Pricing"
4. Verify:
   - Materials panel shows "Materials pricing locked"
   - Checklist shows "Materials priced" as complete (green checkmark)
   - Work order can proceed to approval if other items are complete
