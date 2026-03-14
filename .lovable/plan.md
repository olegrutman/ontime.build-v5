

# TC Pricing Visibility & GC Approval Gate for Purchase Orders

## Summary
Two changes:
1. **Hide all pricing from TC in the PO wizard and PO detail** when `material_responsibility === 'GC'`
2. **Add a "Pending GC Approval" status** so TC-created POs go through GC review before reaching the supplier (unless auto-approve is enabled via the existing `po_requires_upstream_approval` flag)

## Existing Infrastructure
- `project_relationships.po_requires_upstream_approval` (boolean) already exists in the DB — currently display-only in `ProjectRelationships.tsx`
- `project_participants.po_requires_approval` (boolean) already exists — set during invite via `CreateProject.tsx`
- `project_contracts.material_responsibility` ('GC' or 'TC') already drives `pricing_owner_org_id` on POs
- `purchase_orders.pricing_owner_org_id` already determines who can see pricing
- PO status enum currently: `ACTIVE → SUBMITTED → PRICED → ORDERED → DELIVERED`

---

## Part 1: Hide Pricing from TC When GC Is Material-Responsible

### Approach
Thread a `hidePricing` boolean through the wizard. Determined once in `PurchaseOrdersTab` and passed into `POWizardV2`.

### Changes

**`src/components/po-wizard-v2/POWizardV2.tsx`**
- Add `hidePricing?: boolean` prop
- Pass it down to `ItemsScreen`, `ReviewScreen`, `QuantityPanel` (via `ProductPicker`)

**`src/components/po-wizard-v2/ItemsScreen.tsx`**
- Accept `hidePricing?: boolean` prop
- When true: hide unit price (`@ $X.XX/EA`), line totals, subtotals bar, and "Needs Price" badges
- Still show item name, specs, quantity — TC needs to know what's ordered

**`src/components/po-wizard-v2/ReviewScreen.tsx`**
- Accept `hidePricing?: boolean` prop
- When true: hide the "Total" column in the items table, hide the totals bar entirely

**`src/components/po-wizard-v2/QuantityPanel.tsx`**
- Accept `hidePricing?: boolean` prop
- When true: hide the "Line Total" bar and any unit price display

**`src/components/po-wizard-v2/ProductPicker.tsx`**
- Accept and forward `hidePricing` to `QuantityPanel`

**`src/components/project/PurchaseOrdersTab.tsx`**
- Compute `hidePricing` once: `isTC && materialResponsibility === 'GC'`
- Fetch `material_responsibility` from `project_contracts` (already done in `handleCreatePO`, extract to shared state)
- Pass to both create and edit wizard instances
- Also pass to `getCanViewPricing` — when `isTC && materialResponsibility === 'GC'`, return `false` even if TC is the creator

**`src/components/purchase-orders/POCard.tsx`** and **`src/components/purchase-orders/PODetail.tsx`**
- Ensure `canViewPricing=false` propagates to hide all dollar values on PO cards and detail views (already supported via existing prop)

---

## Part 2: GC Approval Gate for TC-Created POs

### New Status: `PENDING_APPROVAL`

**Database migration:**
- Add `PENDING_APPROVAL` to `purchase_orders.status` check constraint
- Add `approved_by` (uuid, nullable) and `approved_at` (timestamptz, nullable) columns to `purchase_orders`

**`src/types/purchaseOrder.ts`**
- Add `'PENDING_APPROVAL'` to `POStatus` type
- Add label and color entries

### Flow
1. When TC creates a PO and clicks "Submit":
   - Check `project_relationships.po_requires_upstream_approval` for the GC↔TC relationship
   - If `true` (approval required): set status to `PENDING_APPROVAL` instead of calling `send-po`
   - If `false` (auto-approve): proceed normally to `SUBMITTED` via `send-po`

2. GC sees `PENDING_APPROVAL` POs in their "From Trade Contractors" tab with an "Approve & Send" action
3. GC clicks "Approve & Send" → calls `send-po` which moves status to `SUBMITTED` and emails supplier
4. GC can also "Reject" → moves back to `ACTIVE` with a note

### Changes

**`src/components/project/PurchaseOrdersTab.tsx`**
- On submit: look up `po_requires_upstream_approval` from `project_relationships` for this project
- If approval required and TC is creator: set PO status to `PENDING_APPROVAL` and toast "Sent to GC for approval"
- Add approval action handler: `handleApprovePO` — updates status to `SUBMITTED` and invokes `send-po` edge function

**`src/components/purchase-orders/POCard.tsx`**
- Show `PENDING_APPROVAL` badge with appropriate styling
- Show "Approve & Send" button for GC when status is `PENDING_APPROVAL`

**`src/components/purchase-orders/PODetail.tsx`**
- Add approval action buttons for GC when viewing a `PENDING_APPROVAL` PO

**`supabase/functions/send-po/index.ts`**
- Add authorization check: if PO was created by TC and `po_requires_upstream_approval` is true, verify the caller belongs to the upstream (GC) org before allowing send

**`src/pages/PurchaseOrders.tsx`**
- Update the send-PO dialog to handle `PENDING_APPROVAL` → `SUBMITTED` transition for GC approvals

---

## Files to Modify

| File | Change |
|---|---|
| **Migration** | Add `PENDING_APPROVAL` status, `approved_by`, `approved_at` columns |
| `src/types/purchaseOrder.ts` | Add status + label + color |
| `src/components/po-wizard-v2/POWizardV2.tsx` | Accept & forward `hidePricing` |
| `src/components/po-wizard-v2/ItemsScreen.tsx` | Conditionally hide prices |
| `src/components/po-wizard-v2/ReviewScreen.tsx` | Conditionally hide prices |
| `src/components/po-wizard-v2/QuantityPanel.tsx` | Conditionally hide line total |
| `src/components/po-wizard-v2/ProductPicker.tsx` | Forward `hidePricing` |
| `src/components/project/PurchaseOrdersTab.tsx` | Compute `hidePricing`, approval gate logic |
| `src/components/purchase-orders/POCard.tsx` | Approval badge + GC action |
| `src/components/purchase-orders/PODetail.tsx` | GC approve/reject actions |
| `supabase/functions/send-po/index.ts` | Auth guard for approval bypass |

## What Does NOT Change
- Existing PO creation logic (data shape, line items, estimate loading)
- Supplier pricing workflow (SUBMITTED → PRICED → ORDERED)
- GC-as-creator flow (GC POs skip approval, go straight to supplier)
- `usePOPricingVisibility` hook logic for supplier-side views

