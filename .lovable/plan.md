
# Work Order Materials Display and Auto-Submit Flow

## Summary

This plan implements three key improvements to the Work Order materials workflow:

1. **Display material items on work order page** - Create a new "Materials" panel that shows all line items from the linked PO
2. **Auto-submit PO to supplier** - When TC completes the Product Picker, automatically set PO status to SUBMITTED
3. **Show pricing and lock markup** - When supplier prices the PO, display the pricing on the work order page with a "Lock Materials Pricing" button

---

## Changes Overview

### 1. New Component: WorkOrderMaterialsPanel

A new panel that displays all material line items from the linked PO.

**File**: `src/components/change-order-detail/WorkOrderMaterialsPanel.tsx`

**Features**:
- Shows a table/list of all line items from the linked PO
- Displays: description, quantity, UOM, length (if applicable)
- Pricing columns (unit price, line total) only visible to pricing-authorized users
- Status badge showing PO status (SUBMITTED, PRICED, etc.)
- When PO is PRICED: shows subtotal, markup editor, and "Lock Materials Pricing" button
- FC sees items but no pricing columns

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│ Materials                                    PO-001234  │
│ ┌────────────────────────────────────┬──────┬─────────┐ │
│ │ Description                        │ Qty  │ Total   │ │
│ ├────────────────────────────────────┼──────┼─────────┤ │
│ │ 2x4 SPF #2 Stud 8'                 │ 50   │ $175.00 │ │
│ │ 2x6 SPF #2 16'                     │ 25   │ $262.50 │ │
│ │ OSB 7/16" 4x8                      │ 10   │ $89.00  │ │
│ └────────────────────────────────────┴──────┴─────────┘ │
│                                                         │
│ Subtotal                                      $526.50   │
│ Markup (15%)                                  +$78.98   │
│ ─────────────────────────────────────────────────────── │
│ Materials Total                               $605.48   │
│                                                         │
│                          [✓ Lock Materials Pricing]     │
└─────────────────────────────────────────────────────────┘
```

---

### 2. Update Hook: Fetch Full PO Line Items

Modify the `linkedPO` query to fetch all line item details, not just totals.

**File**: `src/hooks/useChangeOrderProject.ts`

**Changes**:
- Expand the `po_line_items` select to include: `id, line_number, description, quantity, uom, length_ft, unit_price, line_total`
- Return items array in the linkedPO data structure

**Updated Query**:
```typescript
// Get line items with full details
const { data: lineItems, error: itemsError } = await supabase
  .from('po_line_items')
  .select('id, line_number, description, quantity, uom, length_ft, unit_price, line_total')
  .eq('po_id', changeOrder.linked_po_id)
  .order('line_number');
```

**Updated Return Type**:
```typescript
return {
  id: poData.id,
  po_number: poData.po_number,
  status: poData.status,
  subtotal,
  itemCount,
  items: lineItems || [],  // NEW: Full line item data
};
```

---

### 3. Auto-Submit PO to Supplier

When the PO is created from the Product Picker, automatically set its status to SUBMITTED so the supplier can price it.

**File**: `src/components/project/PurchaseOrdersTab.tsx` (for reference pattern)

**File to Modify**: The PO creation logic in the POWizardV2's completion handler

**Approach**: When creating a PO with a `work_order_id` (linked to a work order), automatically set:
- `status: 'SUBMITTED'` instead of `'ACTIVE'`
- `submitted_at: new Date().toISOString()`
- `submitted_by: user.id`

This ensures the supplier immediately sees the PO for pricing.

---

### 4. Add "Lock Materials Pricing" Mutation

Add a mutation to lock the materials pricing once TC is satisfied with the markup.

**File**: `src/hooks/useChangeOrderProject.ts`

**New Mutation**:
```typescript
const lockMaterialsPricingMutation = useMutation({
  mutationFn: async () => {
    if (!changeOrderId) throw new Error('Invalid state');

    const { error } = await supabase
      .from('change_order_projects')
      .update({ 
        materials_pricing_locked: true,
        materials_locked_at: new Date().toISOString(),
      })
      .eq('id', changeOrderId);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] });
    toast({ title: 'Materials pricing locked' });
  },
});
```

---

### 5. Database Migration

Add a column to track if materials pricing is locked.

**SQL**:
```sql
ALTER TABLE change_order_projects
ADD COLUMN materials_pricing_locked BOOLEAN DEFAULT false,
ADD COLUMN materials_locked_at TIMESTAMPTZ;
```

---

### 6. Update ChangeOrderDetailPage

Add the new `WorkOrderMaterialsPanel` to the main content area.

**File**: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`

**Add in main content area** (between FC Hours and Equipment):
```tsx
{/* Materials from linked PO */}
{changeOrder.requires_materials && linkedPO && linkedPO.items && linkedPO.items.length > 0 && (
  <WorkOrderMaterialsPanel
    linkedPO={linkedPO}
    materialMarkupType={changeOrder.material_markup_type}
    materialMarkupPercent={changeOrder.material_markup_percent ?? 0}
    materialMarkupAmount={changeOrder.material_markup_amount ?? 0}
    onUpdateMarkup={updateMarkup}
    onLockPricing={lockMaterialsPricing}
    isLocked={changeOrder.materials_pricing_locked}
    canViewPricing={isTC || (isGC && changeOrder.material_cost_responsibility === 'GC')}
    isEditable={isTCEditable && isTC}
    projectId={changeOrder.project_id}
  />
)}
```

---

### 7. Update Type Definitions

**File**: `src/types/changeOrderProject.ts`

Add new fields:
```typescript
export interface ChangeOrderProject {
  // ... existing fields ...
  materials_pricing_locked?: boolean;
  materials_locked_at?: string | null;
}
```

Update linked PO type:
```typescript
export interface LinkedPOData {
  id: string;
  po_number: string;
  status: string;
  subtotal?: number;
  itemCount?: number;
  items?: Array<{
    id: string;
    line_number: number;
    description: string;
    quantity: number;
    uom: string;
    length_ft?: number | null;
    unit_price?: number | null;
    line_total?: number | null;
  }>;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/change-order-detail/WorkOrderMaterialsPanel.tsx` | Display materials list from linked PO with pricing and lock button |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/` | Add `materials_pricing_locked` column |
| `src/types/changeOrderProject.ts` | Add new fields and LinkedPOData interface |
| `src/hooks/useChangeOrderProject.ts` | Expand linked PO query, add lock mutation |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Add WorkOrderMaterialsPanel |
| `src/components/project/PurchaseOrdersTab.tsx` | Auto-submit PO when linked to work order |
| `src/components/change-order-detail/MaterialResourceToggle.tsx` | Update to handle auto-submit on PO create |
| `src/components/change-order-detail/index.ts` | Export new component |

---

## Flow Summary

```
TC toggles "Materials Needed" ON
   └─> Supplier auto-activated
   └─> "Add Materials" button appears
         │
         ▼
TC opens Product Picker, selects items
   └─> Creates PO with status = SUBMITTED (auto-submitted)
   └─> Links PO to Work Order
         │
         ▼
Work Order page shows Materials Panel
   └─> Items listed (no pricing yet)
   └─> Status: "Submitted - Awaiting Supplier Pricing"
         │
         ▼
Supplier prices the PO (status → PRICED)
   └─> Pricing flows to Work Order
         │
         ▼
TC sees Materials Panel with pricing
   └─> Can adjust markup (% or lump sum)
   └─> Clicks "Lock Materials Pricing"
         │
         ▼
Pricing locked, shown in TC Pricing Summary
   └─> TC can submit pricing to GC
```

---

## Benefits

1. **Visibility**: TC can see exactly what materials are on the work order
2. **Automated Flow**: No manual "Submit to Supplier" step - PO goes straight to supplier
3. **Clear Status**: Materials panel shows current PO status
4. **Controlled Pricing**: TC can lock in markup before submitting to GC
5. **FC Transparency**: FC can see what materials are needed (just not pricing)
