
# Work Order Materials Integration with PO Wizard

## Problem Summary

When a GC creates a work order and assigns it to a TC with a question about "who is responsible for materials," the TC receives the work order but sees that no materials are needed. The current flow doesn't allow TC to decide if materials and equipment are actually needed to complete the work order.

### Current Issues:
1. **Material decision is locked at GC creation time** - TC cannot change the `requires_materials` flag
2. **No integration between Work Order materials and the PO system** - Materials are tracked separately in `change_order_materials` table with manual entry, not using the sophisticated Product Picker
3. **FC cannot participate in material selection** even when activated
4. **No markup capability** for TC when they are the responsible party

---

## Proposed Solution

### New Flow:

```text
1. GC creates Work Order, assigns TC
   - GC still answers "who is responsible for costs" (GC or TC)
   - But does NOT pre-determine if materials are needed

2. TC receives Work Order for pricing
   - TC can toggle "Materials Needed" ON/OFF
   - TC can toggle "Equipment Needed" ON/OFF

3. When TC toggles "Materials Needed" ON:
   - Supplier on project is auto-activated as participant
   - "Add Materials" button opens the PO Wizard (Product Picker)
   - Creates a PO linked to this Work Order via work_item_id

4. FC can also add materials (if activated on project):
   - FC uses same Product Picker
   - FC CANNOT see pricing (existing rule enforced)

5. Supplier prices the Work Order PO:
   - Same flow as regular PO: SUBMITTED → PRICED
   - Material totals flow back to Work Order

6. TC Markup (when TC is cost-responsible):
   - TC can apply markup to materials: % or lump sum
   - Marked-up total shows in Work Order pricing summary
```

---

## Database Changes

### 1. Add Work Order Reference Column to Purchase Orders

The `purchase_orders` table already has a `work_item_id` column (nullable UUID), which can link POs to work orders. We need to add a column to the `change_order_projects` table to reference the PO directly:

```sql
-- Add column to track linked PO on work order
ALTER TABLE change_order_projects 
ADD COLUMN linked_po_id UUID REFERENCES purchase_orders(id);
```

### 2. Add Markup Fields to Change Order Projects

```sql
-- Add markup fields for materials when TC is responsible
ALTER TABLE change_order_projects
ADD COLUMN material_markup_type TEXT CHECK (material_markup_type IN ('percent', 'lump_sum')),
ADD COLUMN material_markup_percent NUMERIC DEFAULT 0,
ADD COLUMN material_markup_amount NUMERIC DEFAULT 0;
```

---

## TypeScript Type Updates

### File: `src/types/changeOrderProject.ts`

Add new fields to `ChangeOrderProject` interface:

```typescript
export interface ChangeOrderProject {
  // ... existing fields ...
  
  // Linked PO for materials
  linked_po_id?: string | null;
  
  // Material markup (when TC is cost-responsible)
  material_markup_type?: 'percent' | 'lump_sum' | null;
  material_markup_percent?: number;
  material_markup_amount?: number;
}
```

---

## UI Changes

### 1. New Component: `MaterialResourceToggle.tsx`

A panel for TC to toggle material/equipment requirements and manage the linked PO.

**Location**: `src/components/change-order-detail/MaterialResourceToggle.tsx`

**Features**:
- Toggle switch: "Materials Needed"
- Toggle switch: "Equipment Needed"
- When materials enabled: Shows "Add Materials" button that opens PO Wizard
- Displays linked PO info (if exists) with status badge
- Click on linked PO navigates to PO detail

### 2. Update `ChangeOrderDetailPage.tsx`

Add the new `MaterialResourceToggle` panel for TC/FC users:

```tsx
{/* Material Resource Toggle - TC and FC can add materials */}
{(isTC || isFC) && isTCEditable && (
  <MaterialResourceToggle
    changeOrder={changeOrder}
    projectId={changeOrder.project_id}
    isTC={isTC}
    isFC={isFC}
    onUpdateMaterialsNeeded={handleToggleMaterials}
    onUpdateEquipmentNeeded={handleToggleEquipment}
    onPOCreated={handlePOCreated}
  />
)}
```

### 3. Update `POWizardV2.tsx`

Add support for work order context:

```tsx
interface POWizardV2Props {
  // ... existing props ...
  workOrderId?: string;        // NEW: Link to work order
  workOrderTitle?: string;     // NEW: Display in header
}
```

When `workOrderId` is provided:
- PO is created with `work_item_id` set to the work order
- PO name includes work order reference
- Upon completion, callback returns the new PO ID

### 4. New Component: `LinkedPOCard.tsx`

Displays the linked PO on the Work Order detail page:

**Location**: `src/components/change-order-detail/LinkedPOCard.tsx`

**Features**:
- Shows PO number and status badge
- Shows item count and total (if user can view pricing)
- Click opens PO detail in sheet/modal
- Shows delivery tracking info

### 5. New Component: `MaterialMarkupEditor.tsx`

For TC to apply markup to materials when TC is cost-responsible:

**Location**: `src/components/change-order-detail/MaterialMarkupEditor.tsx`

**Features**:
- Radio buttons: "Percentage" or "Lump Sum"
- Input field for value
- Preview of marked-up total
- Only visible when `material_cost_responsibility === 'TC'`

### 6. Update `TCPricingSummary.tsx`

Include material markup in the totals:

```typescript
const materialBase = linkedPO ? poSubtotal : 0;
const markupAmount = materialMarkupType === 'percent' 
  ? materialBase * (materialMarkupPercent / 100)
  : materialMarkupAmount;
const materialsTotal = materialBase + markupAmount;
```

---

## Hook Changes

### Update `useChangeOrder` Hook

Add mutations for:
1. Toggle materials/equipment needed
2. Update linked PO ID
3. Update material markup settings

```typescript
// Toggle materials requirement
const toggleMaterialsMutation = useMutation({
  mutationFn: async (requiresMaterials: boolean) => {
    const { error } = await supabase
      .from('change_order_projects')
      .update({ requires_materials: requiresMaterials })
      .eq('id', changeOrderId);
    
    if (error) throw error;
    
    // If enabling materials, auto-activate supplier
    if (requiresMaterials && availableSuppliers.length > 0) {
      await activateSupplierMutation.mutateAsync(availableSuppliers[0].id);
    }
  },
});

// Link PO to work order
const linkPOMutation = useMutation({
  mutationFn: async (poId: string) => {
    const { error } = await supabase
      .from('change_order_projects')
      .update({ linked_po_id: poId })
      .eq('id', changeOrderId);
    
    if (error) throw error;
  },
});
```

---

## Pricing Visibility Rules

Based on existing memory context:

| Role | Can View Material Pricing? | Can Add Materials? |
|------|---------------------------|-------------------|
| GC (as cost owner) | Yes | No |
| TC (as cost owner) | Yes | Yes |
| TC (not cost owner) | No | Yes |
| FC (activated) | No | Yes |
| Supplier | Yes (their pricing) | No |

### Implementation:
- Use `usePOPricingVisibility` hook for linked PO pricing display
- FC sees material list but no pricing columns
- TC sees pricing only if `material_cost_responsibility === 'TC'` or if TC created the PO

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/change-order-detail/MaterialResourceToggle.tsx` | Toggle for materials/equipment + PO wizard trigger |
| `src/components/change-order-detail/LinkedPOCard.tsx` | Display linked PO info on work order |
| `src/components/change-order-detail/MaterialMarkupEditor.tsx` | TC markup input for materials |

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `linked_po_id`, markup columns |
| `src/types/changeOrderProject.ts` | Add new interface fields |
| `src/hooks/useChangeOrderProject.ts` | Add toggle/link mutations |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Add new panels |
| `src/components/change-order-detail/TCPricingSummary.tsx` | Include PO pricing + markup |
| `src/components/po-wizard-v2/POWizardV2.tsx` | Add work order context props |
| `src/components/po-wizard-v2/HeaderScreen.tsx` | Show work order reference |

---

## Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    WORK ORDER MATERIALS FLOW                    │
└─────────────────────────────────────────────────────────────────┘

GC Creates Work Order ─────────────────────────────────────────────┐
  └─> Assigns TC                                                   │
  └─> Sets cost responsibility (GC or TC)                          │
       ↓                                                           │
┌──────────────────────────────────────────────────────────────────┘
│
│  TC Receives Work Order (tc_pricing status)
│    ├─> Toggles "Materials Needed" = ON
│    │     └─> Supplier auto-activated
│    │     └─> "Add Materials" button appears
│    │           └─> Opens PO Wizard (Product Picker)
│    │                 └─> Selects products
│    │                 └─> Creates PO with work_order_id link
│    │
│    └─> (Optional) FC Activated
│          └─> FC can also add to material list
│          └─> FC CANNOT see pricing
│
│  Supplier Prices PO
│    └─> PO status: SUBMITTED → PRICED
│    └─> Pricing flows to Work Order
│
│  TC Reviews & Applies Markup (if TC is cost-responsible)
│    └─> % or Lump Sum markup
│    └─> Total updates in TC Pricing Summary
│
│  TC Submits Pricing to GC
│    └─> Work Order moves to ready_for_approval
│    └─> GC sees material total (including markup)
│
└───────────────────────────────────────────────────────────────────

```

---

## Benefits

1. **Better Decision Flow**: TC can assess actual material needs after reviewing the scope
2. **Unified Material Selection**: Uses the same sophisticated Product Picker as standalone POs
3. **Clear Cost Attribution**: POs are linked to work orders for tracking and reporting
4. **FC Participation**: Field crews can contribute to material lists without seeing pricing
5. **Flexible Markup**: TC can mark up materials when they are the responsible party
6. **Integrated Delivery Tracking**: Linked PO delivery status visible on work order
