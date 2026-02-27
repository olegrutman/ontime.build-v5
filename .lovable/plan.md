

# Clean Up Work Order GC View: Supplier Name, Labor Detail, Remove Redundancy

## Summary
Three changes: (1) show supplier name on the materials card, (2) show hours/rate detail when the labor card is expanded, and (3) remove redundant pricing info from the sidebar -- the sidebar pricing card duplicates what the main content tiles already show.

## Changes

### 1. Materials Card: Show Supplier Name
**File: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`**

In `CollapsibleMaterialsWrapper`, add an optional `supplierName` prop and display it in the collapsed summary (e.g., "Supplier: ABC Building Supply") and as a subtitle when expanded.

The supplier name comes from the participants array: `participants.find(p => p.role === 'SUPPLIER' && p.is_active)?.organization?.name`. Pass this value when rendering the wrapper at line 474.

### 2. Labor Card: Show Hours + Hourly Rate When Expanded
**File: `src/components/change-order-detail/GCLaborReviewPanel.tsx`**

The expanded view already shows hours and hourly rate per entry (line 80-84: `{entry.hours} hours @ ${entry.hourly_rate}/hr`). However, when `tcLabor` array is empty but `laborTotal > 0`, the expanded view shows nothing useful. Add a fallback that displays the aggregate total with a note that line-item detail is not available. This is already working when entries exist -- no change needed for that case.

The real issue may be that the `tcLabor` array has entries but the expanded content isn't visible due to the panel's current state. Verify the data is flowing correctly and ensure the expanded table headers include "Hours" and "Rate" columns for clarity.

**Specific changes:**
- Add table header row with Description, Hours, Rate, Total columns
- Keep the existing per-entry rows with hours/rate detail (already present)
- When `tcLabor` is empty but `laborTotal > 0`, show the total in a simple row

### 3. Remove Redundant Sidebar Pricing Card for GC
**File: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`**

The GC sidebar currently shows: Checklist -> ContractedPricingCard -> ApprovalPanel. The `ContractedPricingCard` (GCPricingView) duplicates information that's now in the main content area tiles:
- Total Work Order Cost (duplicated in ApprovalPanel summary)
- TC Contract labor detail (duplicated in GCLaborReviewPanel)
- Materials total (duplicated in CollapsibleMaterialsWrapper)
- Equipment total (duplicated in CollapsibleEquipmentWrapper)

**Remove `ContractedPricingCard` from the GC sidebar** (lines 536-545). Keep it for non-GC users. Move the "Total Work Order Cost" display into the ApprovalPanel's always-visible section (not gated by `canFinalize`) so GCs always see the single total.

### 4. ApprovalPanel: Always Show Total Work Order Cost
**File: `src/components/change-order-detail/ApprovalPanel.tsx`**

Move the total cost display out of the `canFinalize` gate. Show a compact "Total Work Order Cost: $X" line always (above the approval summary detail). Remove the per-line breakdown (Labor, Materials, Equipment) from the approval summary since those are now in the main content tiles. Keep only the single total + Contract Change line.

---

## Technical Details

### Supplier Name Source
```tsx
const supplierName = participants.find(p => p.role === 'SUPPLIER' && p.is_active)?.organization?.name;
```
Passed to `CollapsibleMaterialsWrapper` as a new prop.

### CollapsibleMaterialsWrapper Update
```tsx
function CollapsibleMaterialsWrapper({ children, materialTotal, supplierName }: { 
  children: React.ReactNode; materialTotal: number; supplierName?: string 
}) {
  // In collapsed summary, show supplier name
  // In header subtitle area, show "Supplier: X" when available
}
```

### Sidebar Simplification (GC only)
Before:
- Checklist
- ContractedPricingCard (REMOVE)
- ApprovalPanel

After:
- Checklist
- ApprovalPanel (with total always visible)

### Files Modified
1. `src/components/change-order-detail/ChangeOrderDetailPage.tsx` -- add supplier name to materials wrapper, remove ContractedPricingCard from GC sidebar
2. `src/components/change-order-detail/GCLaborReviewPanel.tsx` -- add table headers for hours/rate clarity
3. `src/components/change-order-detail/ApprovalPanel.tsx` -- always show total cost, simplify summary

