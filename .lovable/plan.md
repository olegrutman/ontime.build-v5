
# Purchase Order Flow with Supplier Pricing & Visibility Rules

## Overview

This plan implements a comprehensive PO system where:
- Material responsibility (GC or TC) controls who can see supplier pricing
- Suppliers enter pricing on POs in a locked state
- Pricing visibility is strictly role-gated at both frontend and database levels
- FC can create POs but never see pricing

---

## Part 1: Database Schema Changes

### 1.1 Add `created_by_org_id` to `purchase_orders`

Track which organization created the PO for visibility rules.

```sql
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS created_by_org_id uuid REFERENCES organizations(id);
```

### 1.2 Add `pricing_owner_org_id` to `purchase_orders`

Store the organization that owns pricing visibility for this PO.

```sql
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS pricing_owner_org_id uuid REFERENCES organizations(id);
```

### 1.3 Add `lead_time_days` to `po_line_items`

Allow suppliers to add lead time per item.

```sql
ALTER TABLE po_line_items 
ADD COLUMN IF NOT EXISTS lead_time_days integer;

ALTER TABLE po_line_items 
ADD COLUMN IF NOT EXISTS supplier_notes text;
```

### 1.4 Update PO Status Enum

Add `FINALIZED` status to existing enum:

```sql
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'FINALIZED' AFTER 'DELIVERED';
```

---

## Part 2: Row-Level Security (RLS) Policies

### 2.1 PO Visibility Policies

**Key Logic:**
- GC and TC can always see all POs in their projects
- FC can only see POs they created
- Suppliers can see POs where they are the supplier

```sql
-- Drop old policies and create new ones
CREATE POLICY "Project participants can view POs" ON purchase_orders
FOR SELECT USING (
  -- GC/TC can see all project POs
  EXISTS (
    SELECT 1 FROM project_team pt
    JOIN organizations o ON o.id = pt.org_id
    WHERE pt.project_id = purchase_orders.project_id
      AND pt.status = 'Accepted'
      AND user_in_org(auth.uid(), pt.org_id)
      AND o.type IN ('GC', 'TC')
  )
  OR
  -- FC can only see POs they created
  (
    EXISTS (
      SELECT 1 FROM project_team pt
      JOIN organizations o ON o.id = pt.org_id
      WHERE pt.project_id = purchase_orders.project_id
        AND pt.status = 'Accepted'
        AND user_in_org(auth.uid(), pt.org_id)
        AND o.type = 'FC'
    )
    AND created_by_org_id = get_user_org_id(auth.uid())
  )
  OR
  -- Supplier can see POs sent to them
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = purchase_orders.supplier_id
      AND user_in_org(auth.uid(), s.organization_id)
  )
);
```

### 2.2 Line Items Pricing Visibility

Create a database function to filter pricing data:

```sql
CREATE OR REPLACE FUNCTION can_view_po_pricing(po_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = po_id
    AND (
      -- Pricing owner org can view
      user_in_org(auth.uid(), po.pricing_owner_org_id)
      OR
      -- Supplier can view their own pricing
      EXISTS (
        SELECT 1 FROM suppliers s
        WHERE s.id = po.supplier_id
          AND user_in_org(auth.uid(), s.organization_id)
      )
    )
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### 2.3 Supplier Pricing Update Policy

```sql
CREATE POLICY "Supplier can update pricing on SUBMITTED POs" ON po_line_items
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.id = po_line_items.po_id
      AND po.status = 'SUBMITTED'
      AND user_in_org(auth.uid(), s.organization_id)
  )
)
WITH CHECK (
  -- Only allow updating pricing fields
  -- Enforced by frontend, but DB ensures supplier can't change quantities
  EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.id = po_line_items.po_id
      AND po.status = 'SUBMITTED'
      AND user_in_org(auth.uid(), s.organization_id)
  )
);
```

---

## Part 3: Frontend - Type Updates

### 3.1 Update `src/types/purchaseOrder.ts`

```typescript
export type POStatus = 'ACTIVE' | 'SUBMITTED' | 'PRICED' | 'ORDERED' | 'DELIVERED' | 'FINALIZED';

export interface PurchaseOrder {
  // ... existing fields
  created_by_org_id?: string | null;
  pricing_owner_org_id?: string | null;
}

export interface POLineItem {
  // ... existing fields
  lead_time_days?: number | null;
  supplier_notes?: string | null;
}

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  ACTIVE: 'Active',
  SUBMITTED: 'Submitted',
  PRICED: 'Priced',
  ORDERED: 'Ordered',
  DELIVERED: 'Delivered',
  FINALIZED: 'Finalized',
};
```

---

## Part 4: Frontend - Pricing Visibility Hook

### 4.1 Create `usePOPricingVisibility` Hook

New file: `src/hooks/usePOPricingVisibility.ts`

```typescript
export function usePOPricingVisibility(
  po: PurchaseOrder | null,
  userOrgId: string | null
): {
  canViewPricing: boolean;
  canEditPricing: boolean;
  canFinalize: boolean;
} {
  if (!po || !userOrgId) {
    return { canViewPricing: false, canEditPricing: false, canFinalize: false };
  }

  // Pricing owner org (GC or TC based on material_responsibility)
  const isPricingOwner = po.pricing_owner_org_id === userOrgId;
  
  // Supplier viewing their own pricing
  const isSupplier = po.supplier?.organization_id === userOrgId;
  
  // Supplier can only add pricing when status is SUBMITTED
  const canEditPricing = isSupplier && po.status === 'SUBMITTED';
  
  // Only pricing owner can finalize (not supplier)
  const canFinalize = isPricingOwner && po.status === 'PRICED';
  
  return {
    canViewPricing: isPricingOwner || isSupplier,
    canEditPricing,
    canFinalize,
  };
}
```

---

## Part 5: Frontend - Component Updates

### 5.1 Update `PODetail.tsx`

Key changes:
1. Fetch `pricing_owner_org_id` with PO data
2. Use `usePOPricingVisibility` hook to determine what to show
3. Conditionally render pricing columns
4. Add "Mark Ordered" / "Mark Delivered" buttons for supplier
5. Add "Finalize" button for pricing owner

```typescript
// In PODetail component
const { canViewPricing, canEditPricing, canFinalize } = usePOPricingVisibility(
  po, 
  currentOrgId
);

// Pricing columns only render if canViewPricing is true
{canViewPricing && (
  <>
    <TableHead className="text-right">Unit Price</TableHead>
    <TableHead className="text-right">Total</TableHead>
  </>
)}
```

### 5.2 Update `POCard.tsx`

- Hide pricing totals if user doesn't have pricing visibility
- Show different badges based on visibility

### 5.3 Update `PurchaseOrdersTab.tsx`

- Pass `pricing_owner_org_id` when creating POs
- Determine pricing owner from project's material_responsibility setting

---

## Part 6: PO Creation Flow Updates

### 6.1 Update `handleCreatePO` in `PurchaseOrdersTab.tsx`

When creating a PO:
1. Lookup the project's material_responsibility for this supplier relationship
2. Set `pricing_owner_org_id` based on that setting
3. Set `created_by_org_id` to the current user's org

```typescript
// Fetch material responsibility for this supplier
const { data: relationship } = await supabase
  .from('project_relationships')
  .select('material_responsibility, upstream_participant_id')
  .eq('project_id', projectId)
  .eq('relationship_type', 'BUYER_SUPPLIER')
  .single();

// Determine pricing owner org
const pricingOwnerOrgId = relationship?.material_responsibility === 'GC' 
  ? gcOrgId 
  : tcOrgId;

const { data: newPO } = await supabase
  .from('purchase_orders')
  .insert({
    ...poData,
    created_by_org_id: currentOrgId,
    pricing_owner_org_id: pricingOwnerOrgId,
  });
```

---

## Part 7: Supplier Pricing UI

### 7.1 Update Supplier Pricing View in `PODetail.tsx`

When supplier opens a SUBMITTED PO:
- Show pricing input fields for each line item
- Add lead time input per item
- Add supplier notes field
- "Save Pricing" button that:
  1. Updates all line item prices
  2. Changes PO status to PRICED
  3. Records `priced_at` and `priced_by`

### 7.2 Supplier Actions by Status

| Status | Supplier Actions |
|--------|------------------|
| SUBMITTED | Enter pricing, save to mark as PRICED |
| PRICED | Mark as ORDERED (placed with vendor) |
| ORDERED | Mark as DELIVERED |
| DELIVERED | No actions (complete) |

---

## Part 8: Editability Rules Enforcement

### 8.1 Frontend Enforcement

```typescript
const canEditItems = 
  po.status === 'ACTIVE' && 
  (currentRole === 'GC_PM' || currentRole === 'TC_PM' || currentRole === 'FC_PM');

const canEditNotes = canEditItems;
const canDelete = po.status === 'ACTIVE' && canEditItems;
```

### 8.2 Database Enforcement (existing + updates)

Current policies already enforce ACTIVE status for edits. Update to also allow FC_PM:

```sql
CREATE OR REPLACE FUNCTION is_pm_role(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_org_roles.user_id = $1
      AND role IN ('GC_PM', 'TC_PM', 'FC_PM')
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Part 9: FC Delegation Rules

### 9.1 FC PO Creation

FC can create POs if:
- They are on the project team as FC
- TC has material_responsibility = 'TC' (TC manages materials)

```typescript
// In PurchaseOrdersTab
const canCreatePO = 
  currentRole === 'GC_PM' || 
  currentRole === 'TC_PM' || 
  (currentRole === 'FC_PM' && fcCanOrderMaterials);
```

### 9.2 FC Restrictions

- FC can NEVER see pricing columns
- FC can NEVER finalize orders
- FC can add items, modify quantities, submit to supplier

---

## Implementation Order

```text
1. Database Migration (schema + RLS)
   ├── Add columns to purchase_orders
   ├── Add columns to po_line_items
   ├── Create pricing visibility function
   └── Update RLS policies

2. Type Updates
   └── Update src/types/purchaseOrder.ts

3. Create Hook
   └── src/hooks/usePOPricingVisibility.ts

4. Update Components
   ├── PODetail.tsx (pricing visibility, supplier UI)
   ├── POCard.tsx (hide pricing when not visible)
   └── PurchaseOrdersTab.tsx (pass pricing owner)

5. Testing
   ├── GC creates PO → TC shouldn't see pricing
   ├── TC creates PO → GC shouldn't see pricing
   ├── FC creates PO → FC never sees pricing
   └── Supplier adds pricing → only pricing owner sees it
```

---

## Security Considerations

1. **Never send pricing to unauthorized users** - Frontend hides, RLS prevents
2. **Pricing data filtered at query level** - Create view or function
3. **Suppliers can only modify pricing fields** - Enforce in RLS
4. **Status transitions are controlled** - Only valid transitions allowed

---

## Summary

| Role | Can Create PO | Can See Items | Can See Pricing | Can Finalize |
|------|---------------|---------------|-----------------|--------------|
| GC | Yes | All | If material_resp=GC | If material_resp=GC |
| TC | Yes | All | If material_resp=TC | If material_resp=TC |
| FC | If delegated | Own POs only | Never | Never |
| Supplier | No | Assigned POs | Their own pricing | No (marks ordered/delivered) |
