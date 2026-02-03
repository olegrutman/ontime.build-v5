
# Plan: Fix Material Total Display in ContractedPricingCard

## Problem

The "Materials (to GC)" line in the Work Order Pricing tile shows `$0.00` even though materials are priced and locked. This affects the TC view specifically.

## Root Cause

The `ContractedPricingCard` component reads `materialTotal` directly from `changeOrder.material_total` (database column):

```typescript
// Line 255 in ContractedPricingCard.tsx
const materialTotal = changeOrder.material_total || 0;
```

However, the database column is `0.00` because:
1. Materials pricing was locked before the code fix that calculates and stores `material_total`
2. The existing work order has stale data

Meanwhile, the `TCPricingSummary` sidebar card shows correct values because it **recalculates** the total from `linkedPO.subtotal` + markup:

```typescript
// TCPricingSummary.tsx - lines 47-56
const baseMatTotal = linkedPO ? (linkedPO.subtotal || 0) : ...;
const markupAmount = materialMarkupType === 'percent'
  ? baseMatTotal * (materialMarkupPercent / 100)
  : (materialMarkupType === 'lump_sum' ? materialMarkupAmount : 0);
const materialsTotal = baseMatTotal + markupAmount;
```

## Solution

Update `ContractedPricingCard` to recalculate `materialTotal` from linked PO data when available, matching how `TCPricingSummary` handles it. This ensures the UI always displays accurate values regardless of whether the database column was updated.

## Implementation

### File: `src/components/change-order-detail/ContractedPricingCard.tsx`

**Current code (lines 253-256):**
```typescript
// Calculate totals
const laborTotal = changeOrder.labor_total || 0;
const materialTotal = changeOrder.material_total || 0;
const equipmentTotal = changeOrder.equipment_total || 0;
```

**Updated code:**
```typescript
// Calculate totals
const laborTotal = changeOrder.labor_total || 0;
const equipmentTotal = changeOrder.equipment_total || 0;

// Material total: recalculate from PO data if available (handles stale DB values)
// This matches the logic in TCPricingSummary for consistency
const baseMatTotal = linkedPO?.subtotal || 0;
const markupAmount = changeOrder.material_markup_type === 'percent'
  ? baseMatTotal * ((changeOrder.material_markup_percent || 0) / 100)
  : changeOrder.material_markup_type === 'lump_sum'
    ? (changeOrder.material_markup_amount || 0)
    : 0;
const materialTotal = baseMatTotal > 0 
  ? baseMatTotal + markupAmount 
  : (changeOrder.material_total || 0); // Fallback to DB value if no linked PO
```

This approach:
- Uses the linked PO subtotal + configured markup when a PO exists
- Falls back to the database column when there's no linked PO (for legacy manual materials)
- Ensures the TC view shows accurate revenue figures

## Files to Modify

| File | Change |
|------|--------|
| `src/components/change-order-detail/ContractedPricingCard.tsx` | Recalculate `materialTotal` from `linkedPO` data |

## Expected Result

After this change:
- TC's "Work Order Pricing" card will show:
  - **Revenue section:** "Materials (to GC)" = $8,452.50 (subtotal $7,350 + 15% markup $1,102.50)
  - **Costs section:** "Materials (Supplier Cost)" = $7,350
  - **Materials Markup:** $1,102.50
  - **Profit:** Correctly calculated including material profit
- GC's view will also show correct material totals
- Both views stay consistent with the TCPricingSummary sidebar
