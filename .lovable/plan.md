
# Plan: Add TC Labor Details Tile for GC on Work Order Approval Page

## Overview
Currently, the GC's work order approval page shows only the total labor amount in the "Finalize Work Order" panel. This plan adds a dedicated tile that displays the TC's labor pricing details - whether hourly (hours x rate) or lump sum - so the GC can properly review the pricing before approval.

## Current State
- GC sees: Labor Total, Material Total, Equipment Total, and Final Price
- GC does NOT see: The breakdown of how labor was priced (hours/rate vs lump sum)
- The `tcLabor` data is already fetched and available in `ChangeOrderDetailPage.tsx` but not passed to `ApprovalPanel`

## Changes Required

### 1. Create New Component: `GCLaborReviewPanel.tsx`
Create a new component that displays the TC labor entries in a read-only format for GC review.

**Location**: `src/components/change-order-detail/GCLaborReviewPanel.tsx`

**Features**:
- Displays each TC labor entry with:
  - Description (if provided)
  - Pricing type indicator (Hourly clock icon or Lump Sum dollar icon)
  - For hourly: Shows "X hours @ $Y/hr = $Z"
  - For lump sum: Shows "Lump Sum: $X"
- Shows the total labor amount at the bottom
- Read-only view (no edit buttons for GC)
- Uses consistent styling with other panels in the detail page

### 2. Update `ChangeOrderDetailPage.tsx`
Add the new `GCLaborReviewPanel` to the main content area when the user is a GC.

**Changes**:
- Import the new component
- Add conditional rendering for GC users to show the labor review panel
- Position it in the main content area (left column) alongside Materials and Equipment panels

### 3. Optional: Simplify ApprovalPanel
Since labor details will now be in a dedicated panel, consider whether to keep or remove the "Labor Total" line from the ApprovalPanel's pricing summary to avoid duplication.

---

## Technical Details

### New Component Structure
```text
+----------------------------------+
| Trade Contractor Labor           |
| [HardHat icon]                   |
+----------------------------------+
| [Clock] Labor Hours              |
|   8 hours @ $75.00/hr   $600.00  |
+----------------------------------+
| [Dollar] Overtime Premium        |
|   Lump Sum              $200.00  |
+----------------------------------+
| Total Labor              $800.00 |
+----------------------------------+
```

### Props Interface
```typescript
interface GCLaborReviewPanelProps {
  tcLabor: ChangeOrderTCLabor[];
}
```

### Visibility Rules
- GC can see: Hours, hourly rate, lump sum amounts, descriptions
- GC cannot see: FC (Field Crew) pricing details (already enforced by current logic)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/change-order-detail/GCLaborReviewPanel.tsx` | Create new component |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Import and add the new panel for GC users |
| `src/components/change-order-detail/index.ts` | Export the new component |

---

## Outcome
After implementation, when a GC views a work order in "Ready for Approval" status, they will see:
1. A dedicated "Trade Contractor Labor" tile showing the detailed breakdown
2. Each labor entry clearly identified as hourly or lump sum
3. Full transparency on how the TC calculated their labor pricing
