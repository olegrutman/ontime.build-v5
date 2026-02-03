

# Plan: Fix TC Work Order Pricing Display and GC Material Visibility

## Problem Analysis

After analyzing the codebase, I identified several interconnected issues:

### Issue 1: TC's ContractedPricingCard Shows Incorrect Material Costs

In `ContractedPricingCard.tsx` (line 240), the TC view calculates `materialCost` from the legacy `materials` array:
```typescript
const materialCost = materials.reduce((sum, m) => sum + ((m.unit_cost || 0) * m.quantity), 0);
```

But the new workflow uses **linked POs** (`po_line_items`), not `change_order_materials`. So `materialCost` is always `0` when using the PO flow, causing:
- "Materials (Base Cost)" to show $0.00
- Profit calculation to be incorrect

### Issue 2: TC's ContractedPricingCard Shows Wrong Material Revenue

Line 112 shows "Materials Markup" as `materialTotal`:
```typescript
<PricingRow label="Materials Markup" value={materialTotal} />
```

But `materialTotal` comes from `changeOrder.material_total`, which is the **total with markup**, not just the markup amount. The label is misleading.

### Issue 3: WorkOrderMaterialsPanel Shows Incorrect Data After Locking

When materials pricing is locked:
- The locked indicator shows, but prices still display correctly
- However, the `TCPricingSummary` sidebar card doesn't receive the correct subtotal because `linkedPO.subtotal` might be 0 if the query isn't properly calculating it from line items

### Issue 4: GC Cannot See Base Cost When Not Cost-Responsible

Currently, if `material_cost_responsibility = 'TC'`, the GC only sees the marked-up total. According to the memory note:
> "when gc gets work order back to finalize it they can see material list and marked up price but not base price if they are not responsible for the material cost"

This is **correct behavior** per privacy rules - GC shouldn't see TC's costs.

---

## Solution

### Part 1: Fix ContractedPricingCard for TC View

Update the TC view to properly calculate material base cost from the linked PO:

**Current flow:**
- `materialCost` is calculated from `materials` array (legacy, empty when using POs)

**New flow:**
- Pass `linkedPO` data to `ContractedPricingCard`
- Calculate `materialCost` from `linkedPO.subtotal` (base cost before markup)
- Calculate markup as `materialTotal - materialCost`

### Part 2: Fix Label "Materials Markup" → Show Both

For TC revenue breakdown, show:
- "Materials (to GC)" = full materialTotal (what GC pays)
- Under Costs: "Materials (Base Cost)" = linkedPO.subtotal

### Part 3: Update WorkOrderMaterialsPanel After Lock

Ensure the panel shows the locked pricing summary even when `canViewPricing` is false in certain conditions.

---

## Implementation Details

### File 1: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`

Pass `linkedPO` to `ContractedPricingCard`:

```typescript
<ContractedPricingCard
  changeOrder={changeOrder}
  fcHours={fcHours}
  tcLabor={tcLabor}
  materials={materials}
  equipment={equipment}
  participants={participants}
  currentRole={currentRole}
  linkedPO={linkedPO}  // NEW PROP
/>
```

### File 2: `src/components/change-order-detail/ContractedPricingCard.tsx`

Update interface to accept `linkedPO`:

```typescript
interface ContractedPricingCardProps {
  // ... existing props
  linkedPO?: {
    id: string;
    po_number: string;
    status: string;
    subtotal?: number;
    itemCount?: number;
    items?: any[];
  } | null;
}
```

Update TC view's cost calculation:

```typescript
// Material base cost (from linked PO if using PO workflow, otherwise from materials array)
const materialCost = linkedPO?.subtotal 
  ?? materials.reduce((sum, m) => sum + ((m.unit_cost || 0) * m.quantity), 0);
```

Update `TCPricingView` to show:
- Revenue section: "Materials" = materialTotal (full amount to GC)
- Costs section: "Materials (Supplier Cost)" = materialCost (base from PO)

### File 3: Update Profit Calculation

```typescript
// TC profit calculation
const materialTotal = changeOrder.material_total || 0;
const materialCost = linkedPO?.subtotal || 0;
const profit = revenue - fcCost - materialCost;
```

---

## Data Flow Summary

```text
Supplier prices PO items
    ↓
po_line_items.line_total calculated
    ↓
linkedPO.subtotal = sum of line_totals ($7,350)
    ↓
TC sets markup (15%)
    ↓
TC locks pricing → lockMaterialsPricingMutation
    ↓
Calculates: 
  - subtotal = $7,350 (from PO)
  - markup = $1,102.50 (15%)
  - materialTotal = $8,452.50
    ↓
Stores on change_order_projects:
  - material_total = $8,452.50
    ↓
ContractedPricingCard reads:
  - For TC: materialCost = linkedPO.subtotal ($7,350)
  - For TC: materialTotal = changeOrder.material_total ($8,452.50)
  - For TC: markup = $8,452.50 - $7,350 = $1,102.50
  - Profit = revenue - fcCost - materialCost
```

---

## GC Visibility (Confirmed Correct)

GC should see:
- Materials list (item descriptions, quantities) 
- Marked-up total ($8,452.50)
- Should NOT see: supplier pricing, base cost, or markup breakdown

This preserves TC's margin privacy when TC is cost-responsible.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Pass `linkedPO` to ContractedPricingCard |
| `src/components/change-order-detail/ContractedPricingCard.tsx` | Add `linkedPO` prop, fix material cost calculation for TC view |

---

## Testing Steps

After implementation:

1. **TC View Test:**
   - Open work order with locked materials pricing
   - Verify "Work Order Pricing" card shows:
     - Revenue section: correct materialTotal
     - Costs section: correct base cost from PO
     - Correct profit calculation

2. **GC View Test:**
   - Open same work order as GC
   - Verify "Materials" shows marked-up total only
   - Verify no base cost or markup breakdown visible

3. **Summary Card Test:**
   - For TC: Verify TCPricingSummary shows correct breakdown
   - Verify materials line shows total with markup indicator

