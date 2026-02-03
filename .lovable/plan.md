
# Plan: Fix GC Material Visibility in Work Order

## Problem Summary

The user reports two issues:
1. **"Materials to GC" not showing correctly in pricing tile** - Need to verify the `ContractedPricingCard` shows the correct material total for GC
2. **GC cannot see materials list and marked-up total** - The `WorkOrderMaterialsPanel` hides all pricing info when GC is not cost-responsible

## Root Cause Analysis

### Issue 1: ContractedPricingCard - Already Fixed
The previous changes to `ContractedPricingCard.tsx` calculate `materialTotal` from `linkedPO.subtotal + markup`. This should be working correctly for both TC and GC views.

### Issue 2: WorkOrderMaterialsPanel - GC Visibility Broken
In `ChangeOrderDetailPage.tsx` line 169:
```typescript
canViewPricing={isTC || (isGC && changeOrder.material_cost_responsibility === 'GC')}
```

When `material_cost_responsibility = 'TC'`:
- `canViewPricing = false` for GC
- The entire pricing section (lines 133-193) is hidden from GC
- GC can see item list but **cannot see the marked-up total they're paying**

This violates the requirement: GC should see the marked-up total (their cost) without seeing the base cost or markup breakdown.

## Solution

### Part 1: Add GC-Specific Total View to WorkOrderMaterialsPanel

Create a new visibility tier for GC:
- `canViewPricing` (TC or cost-responsible GC): Full breakdown (subtotal, markup %, total)
- `canViewMarkedUpTotal` (GC not cost-responsible): Only the final marked-up total (no base cost)
- Neither: Just item count

### Part 2: Update ChangeOrderDetailPage Props

Pass a new prop to distinguish between:
- Full pricing visibility (TC, cost-responsible GC)
- Marked-up total only (GC not cost-responsible)

## Implementation Details

### File 1: `src/components/change-order-detail/WorkOrderMaterialsPanel.tsx`

Add new prop and GC-specific total view:

```typescript
interface WorkOrderMaterialsPanelProps {
  // ... existing props
  canViewPricing: boolean;
  canViewMarkedUpTotal?: boolean;  // NEW: For GC when not cost-responsible
  // ...
}
```

Add section for GC marked-up total (after the `canViewPricing && isPriced` block):

```typescript
{/* GC View - marked-up total only (when materials are locked) */}
{!canViewPricing && canViewMarkedUpTotal && isLocked && (
  <>
    <Separator />
    <div className="flex justify-between font-medium">
      <span>Materials Total</span>
      <span>${materialsTotal.toFixed(2)}</span>
    </div>
    <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground bg-muted/50 rounded-lg">
      <Lock className="w-4 h-4" />
      Materials pricing locked
    </div>
  </>
)}
```

### File 2: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`

Update the `WorkOrderMaterialsPanel` invocation:

```typescript
<WorkOrderMaterialsPanel
  linkedPO={linkedPO}
  materialMarkupType={changeOrder.material_markup_type as 'percent' | 'lump_sum' | null}
  materialMarkupPercent={changeOrder.material_markup_percent ?? 0}
  materialMarkupAmount={changeOrder.material_markup_amount ?? 0}
  onUpdateMarkup={updateMarkup}
  onLockPricing={lockMaterialsPricing}
  isLocked={changeOrder.materials_pricing_locked}
  canViewPricing={isTC || (isGC && changeOrder.material_cost_responsibility === 'GC')}
  canViewMarkedUpTotal={isGC}  // NEW: GC can always see the total they're paying
  isEditable={isTCEditable && isTC}
  isLocking={isLockingMaterialsPricing}
/>
```

## Visibility Matrix After Fix

| User Role | Cost Responsibility | Materials List | Base Cost | Markup % | Marked-Up Total |
|-----------|-------------------|----------------|-----------|----------|-----------------|
| TC        | Either            | Yes            | Yes       | Yes      | Yes             |
| GC        | GC                | Yes            | Yes       | Yes      | Yes             |
| GC        | TC                | Yes            | **No**    | **No**   | **Yes** (fixed) |
| FC        | Either            | Yes            | No        | No       | No              |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/change-order-detail/WorkOrderMaterialsPanel.tsx` | Add `canViewMarkedUpTotal` prop and GC-specific total section |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Pass `canViewMarkedUpTotal={isGC}` to WorkOrderMaterialsPanel |

## Expected Behavior After Fix

For GC when TC is cost-responsible:
1. **Materials panel** shows:
   - Item list (descriptions, quantities, UOM) - no individual prices
   - "Materials Total: $X,XXX.XX" (marked-up amount)
   - "Materials pricing locked" indicator
2. **Work Order Pricing card** shows:
   - "Materials: $X,XXX.XX" (same marked-up total)
   - Total contracted price includes materials

This maintains privacy (GC doesn't see supplier costs or markup %) while providing transparency (GC knows exactly what they're paying for materials).
