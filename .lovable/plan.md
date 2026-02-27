

# Fix All Three Issues: TC Labor Visibility, Materials Total Mismatch, forwardRef Warnings

## Issue 1: TC Labor Tile Not Rendering

**Root cause**: The condition `tcLabor.length > 0` prevents the tile from showing when the `tcLabor` array is empty but `changeOrder.labor_total` is populated (e.g., aggregate was set by a DB trigger but individual entries weren't fetched or exist in a different form).

**Fix in `ChangeOrderDetailPage.tsx` (line 406)**:
Change condition from:
```tsx
(changeOrder as any).pricing_mode !== 'tm' && isGC && tcLabor.length > 0
```
To:
```tsx
(changeOrder as any).pricing_mode !== 'tm' && isGC && (tcLabor.length > 0 || (changeOrder.labor_total ?? 0) > 0)
```

**Fix in `GCLaborReviewPanel.tsx`**: Update the empty-state branch (lines 20-33) to show the stored `labor_total` when `tcLabor` array is empty but a total exists. Add a new `laborTotal` prop so it can display the aggregate value even without line items.

## Issue 2: Materials Total Mismatch

**Root cause**: `ApprovalPanel` and `CollapsibleMaterialsWrapper` use `changeOrder.material_total` (stale DB value = $0), while `ContractedPricingCard` recalculates from `linkedPO.subtotal + markup` (correct value = $14,884).

**Fix in `ChangeOrderDetailPage.tsx`**: Compute a `computedMaterialTotal` once at the page level using the same formula as `ContractedPricingCard`, then pass it to:
- `CollapsibleMaterialsWrapper` (line 473)
- `ApprovalPanel` as a new `computedMaterialTotal` prop (line 537)

**Fix in `ApprovalPanel.tsx`**: Accept optional `computedMaterialTotal` prop and use it instead of `changeOrder.material_total` in the Approval Summary and finalize dialog.

The formula (matching `ContractedPricingCard`):
```tsx
const baseMatTotal = linkedPO?.subtotal || 0;
const markupAmount = changeOrder.material_markup_type === 'percent'
  ? baseMatTotal * ((changeOrder.material_markup_percent || 0) / 100)
  : changeOrder.material_markup_type === 'lump_sum'
    ? (changeOrder.material_markup_amount || 0)
    : 0;
const computedMaterialTotal = baseMatTotal > 0
  ? baseMatTotal + markupAmount
  : (changeOrder.material_total || 0);
```

## Issue 3: forwardRef Console Warnings

**Root cause**: `CollapsibleTrigger asChild` tries to pass a `ref` to its child. When the child is a custom component like `CardHeader` wrapped inside `CollapsibleMaterialsWrapper` or used with `PricingRow`, React warns because the component doesn't forward refs.

**Fix**: Use `React.forwardRef` on `CollapsibleMaterialsWrapper` and `CollapsibleEquipmentWrapper` inner `CardHeader` elements. Since `CardHeader` is from shadcn and already forwards refs, the actual fix is simpler: remove `asChild` from `CollapsibleTrigger` and wrap `CardHeader` directly, OR ensure the trigger target properly forwards the ref. The cleanest approach: wrap the `CardHeader` in a plain `div` as the trigger target instead of using `asChild` on `CardHeader`.

---

## Files Modified

1. **`src/components/change-order-detail/ChangeOrderDetailPage.tsx`**
   - Compute `computedMaterialTotal` once near line 207
   - Update GCLaborReviewPanel condition (line 406) to also check `changeOrder.labor_total > 0`
   - Pass `laborTotal={changeOrder.labor_total}` to `GCLaborReviewPanel`
   - Pass `computedMaterialTotal` to `CollapsibleMaterialsWrapper` and `ApprovalPanel`
   - Fix `CollapsibleMaterialsWrapper` and `CollapsibleEquipmentWrapper` trigger: replace `asChild` on `CollapsibleTrigger` with a wrapping approach that avoids ref issues

2. **`src/components/change-order-detail/GCLaborReviewPanel.tsx`**
   - Add optional `laborTotal` prop
   - When `tcLabor.length === 0` but `laborTotal > 0`, show the stored total instead of "No labor entries"

3. **`src/components/change-order-detail/ApprovalPanel.tsx`**
   - Add optional `computedMaterialTotal` prop
   - Use `computedMaterialTotal ?? changeOrder.material_total` in summary and dialog calculations

