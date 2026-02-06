

# Allow GC and TC to See All Project POs; Show Pricing Only to Responsible Party

## Problem

1. **Visibility**: The current RLS policy on `purchase_orders` only allows the *creating* organization and the supplier to see POs. If a TC creates a PO, the GC on the same project cannot see it (and vice versa). Both GC and TC should see all POs on a shared project.

2. **Pricing on Cards**: The `PurchaseOrdersTab` never passes `canViewPricing` to `POCard`, so pricing always defaults to hidden on the card list. The `usePOPricingVisibility` hook is only used in `PODetail`.

## Changes

### 1. Database Migration: Update RLS SELECT Policy

Update the `purchase_orders` SELECT policy to also allow any user whose organization is on the same project team.

```text
DROP POLICY "Project participants and suppliers can view POs" ON purchase_orders;

CREATE POLICY "Project team and suppliers can view POs"
ON purchase_orders FOR SELECT
USING (
  -- Creator org can always view
  user_in_org(auth.uid(), organization_id)
  OR
  -- Supplier assigned to PO can view
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = purchase_orders.supplier_id
      AND user_in_org(auth.uid(), s.organization_id)
  )
  OR
  -- Any org on the project team can view
  (
    purchase_orders.project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = purchase_orders.project_id
        AND pt.organization_id = get_user_org_id(auth.uid())
        AND pt.status = 'ACCEPTED'
    )
  )
);
```

Also update the `po_line_items` SELECT policy to match:

```text
DROP POLICY "PO participants can view line items" ON po_line_items;

CREATE POLICY "PO team and suppliers can view line items"
ON po_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = po_line_items.po_id
    AND (
      user_in_org(auth.uid(), po.organization_id)
      OR
      EXISTS (
        SELECT 1 FROM suppliers s
        WHERE s.id = po.supplier_id
          AND user_in_org(auth.uid(), s.organization_id)
      )
      OR
      (
        po.project_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM project_team pt
          WHERE pt.project_id = po.project_id
            AND pt.organization_id = get_user_org_id(auth.uid())
            AND pt.status = 'ACCEPTED'
        )
      )
    )
  )
);
```

### 2. `src/components/project/PurchaseOrdersTab.tsx` -- Wire Up Pricing Visibility

Currently the tab fetches POs but never computes per-PO pricing visibility for the card grid. Changes:

- Import `usePOPricingVisibility` (or compute inline since the hook expects a single PO)
- For each PO in the grid, compute `canViewPricing` by checking if `currentOrgId` matches `po.pricing_owner_org_id` or the supplier's org
- Pass computed `canViewPricing` to each `POCard`
- Ensure the PO query includes `pricing_owner_org_id` and `supplier.organization_id` (add `organization_id` to the supplier select)

Changes in the `fetchPurchaseOrders` query:
- Add `pricing_owner_org_id` to the select (it's already included via `*`)
- Update supplier select to include `organization_id`: `supplier:suppliers(id, name, supplier_code, contact_info, organization_id)`

In the card grid, compute per-PO visibility:
```text
const isPricingOwner = po.pricing_owner_org_id === currentOrgId;
const isPoSupplier = po.supplier?.organization_id === currentOrgId;
const canViewPricing = isPricingOwner || isPoSupplier;
```

Pass to POCard:
```text
<POCard
  ...
  canViewPricing={canViewPricing}
/>
```

### 3. `src/components/purchase-orders/POCard.tsx` -- Update Line Items Query

The card currently only selects `line_items:po_line_items(id)` (just the id). For pricing to display on cards, the query needs `line_total` and `unit_price`:
- Update the PurchaseOrdersTab query to select: `line_items:po_line_items(id, unit_price, line_total)`

### 4. `src/pages/PurchaseOrders.tsx` -- Cross-Org Visibility (Global PO Page)

The global PO page also queries POs without project-team awareness. No changes needed here since the RLS policy update will handle it at the database level. However, this page doesn't show pricing at all (it's the older list view), so no pricing changes needed.

## Summary of Files

| File | Change |
|------|--------|
| Database migration (new) | Update RLS SELECT on `purchase_orders` and `po_line_items` to include project team members |
| `src/components/project/PurchaseOrdersTab.tsx` | Add `organization_id` to supplier select, compute per-PO `canViewPricing`, pass to POCard, expand line_items select |
| `src/components/purchase-orders/POCard.tsx` | No code changes needed (already accepts `canViewPricing` prop) |

## What This Achieves

- GC and TC on the same project can both see all POs regardless of who created them
- Pricing columns and totals are only shown to the party designated as `pricing_owner_org_id` (and to the supplier)
- Field Crews on the project team can see POs exist but cannot see pricing
- No changes to edit/finalize permissions (those remain as-is)

