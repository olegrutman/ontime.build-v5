

# Unify Progress Bars to Match WorkOrderProgressBar Design

The app currently has two different progress bar styles:

1. **WorkOrderProgressBar** (on the Work Order detail page) -- numbered circles with connector lines and labels below, matching the screenshot
2. **StateProgressBar** (used in ChangeWorkDetail, WorkItemDetail, WorkItemPage) -- a different style with smaller circles, no labels below the connector lines

This plan updates the `StateProgressBar` component to match the `WorkOrderProgressBar` design so the look is consistent throughout the app.

## What Changes

### 1. Redesign `StateProgressBar` in `src/components/StateProgressBar.tsx`

Replace the current implementation with a layout that matches `WorkOrderProgressBar`:
- Numbered circles (w-7 h-7 / sm:w-8 sm:h-8) with border-2
- Completed steps show green background with a check icon
- Current step shows primary color fill
- Future steps show muted/gray
- Connector lines between circles (h-0.5, green when completed, muted otherwise)
- Labels appear below each circle (text-[11px] font-medium)

Remove the separate `StateProgressLabels` export -- labels will be integrated directly into the bar (matching how `WorkOrderProgressBar` renders its labels inline under each circle).

### 2. Update consumers of `StateProgressLabels`

Remove `StateProgressLabels` usage from:
- `src/components/WorkItemDetail.tsx` (line 66)
- `src/components/work-item/WorkItemProgress.tsx` (line 12)
- `src/components/change-work/ChangeWorkDetail.tsx` (line 153)

Since labels are now built into the bar itself, these separate label rows are no longer needed.

## Files Modified

| File | Change |
|------|--------|
| `src/components/StateProgressBar.tsx` | Redesign to match WorkOrderProgressBar style with inline labels |
| `src/components/WorkItemDetail.tsx` | Remove `StateProgressLabels` import and usage |
| `src/components/work-item/WorkItemProgress.tsx` | Remove `StateProgressLabels` import and usage |
| `src/components/change-work/ChangeWorkDetail.tsx` | Remove `StateProgressLabels` import and usage |

## What Is NOT Changed
- `WorkOrderProgressBar` itself (it already has the target design)
- No database, logic, permissions, or route changes
- Progress bar functionality (readonly, state tracking) unchanged

