

# Work Order Detail Page Redesign

## Current Problems

1. **No sticky context bar** -- When scrolling, you lose sight of the Work Order title, status, and project name. The project overview page has a great sticky bar pattern that should be reused here.
2. **No way to navigate back via tabs** -- The only way back to the Work Orders list is the browser back arrow or the small "Back" button. Users expect to click a "Work Orders" tab to return, matching the project overview pattern.
3. **Information is scattered** -- The header card only shows title/status/location. The progress checklist is buried in the sidebar at the bottom. Pricing, scope, labor, and materials are stacked vertically with no visual grouping or hierarchy. On a large screen, the sidebar has too many disconnected cards.
4. **No progress indicator** -- There is no visual progress bar showing how far along the Work Order is (e.g., Draft -> TC Pricing -> Ready for Approval -> Contracted). The checklist exists but is hidden in the sidebar.

## Solution

Replace the generic `AppLayout` with a custom layout that mirrors the ProjectHome sticky bar + tabs pattern, and reorganize the content for better information hierarchy.

### 1. Sticky Top Bar (like Project Overview)

Add a sticky header with:
- Sidebar trigger (hamburger)
- Project name (clickable, navigates back to project)
- Work Order title
- Status badge
- Notification bell
- A tab row with: **Overview** | **Work Orders** (clickable to navigate back to project Work Orders tab)

Clicking "Work Orders" navigates to `/project/{projectId}?tab=work-orders`, giving users the familiar tab-based navigation back to the list.

### 2. Status Progress Bar (top of content area)

Below the sticky bar, add a horizontal multi-step progress indicator showing the Work Order lifecycle stages:

```text
[In Progress] --> [TC Pricing] --> [Ready for Approval] --> [Contracted]
```

- Each step is a circle/node connected by lines
- Completed steps are filled with green
- Current step is highlighted with the brand purple
- Future steps are grayed out
- Rejected status shows a red indicator on the current step
- FC Input step only appears when a Field Crew is a participant

This immediately tells the user where the Work Order stands without scrolling.

### 3. Reorganized Content Layout

Keep the 65/35 two-zone split but reorganize cards for better grouping:

**Zone A (Main, Left) -- in order:**
1. **Header Card** -- Title, project name, location, work type, created date, description (merged with current ChangeOrderScopePanel to reduce card count)
2. **Rejection Alert** -- Only when applicable, high-visibility warning
3. **Labor Section** -- TC Labor panel (or FC Hours panel, depending on role)
4. **Materials Section** -- Materials panel with linked PO info
5. **Equipment Section** -- When applicable

**Zone B (Sidebar, Right) -- in order:**
1. **Pricing Card** -- Contracted pricing / My Earnings (most important sidebar info, moved to top)
2. **Approval Panel** -- GC finalize actions (when applicable, near pricing for context)
3. **Checklist Card** -- Ready-for-approval checklist
4. **Participants Card** -- Team activation
5. **Resource Toggles** -- Material/Equipment toggles (TC only)

The key change: merge the Header and Scope panels into one card, and move the Pricing card to the top of the sidebar since it is the most glanceable info.

## Technical Details

### New Component: `WorkOrderTopBar`

A new component `src/components/change-order-detail/WorkOrderTopBar.tsx` that mirrors `ProjectTopBar`:
- Accepts: `projectName`, `projectId`, `workOrderTitle`, `status`
- Renders: sticky header with sidebar trigger, breadcrumb-style title, status badge, tabs
- The "Work Orders" tab click navigates to `/project/{projectId}?tab=work-orders`
- The "Overview" tab click navigates to `/project/{projectId}?tab=overview`

### New Component: `WorkOrderProgressBar`

A new component `src/components/change-order-detail/WorkOrderProgressBar.tsx`:
- Accepts: `status` (ChangeOrderStatus), `hasFCParticipant` (boolean)
- Renders a horizontal step indicator with the lifecycle stages
- Dynamically shows/hides the "FC Input" step based on whether a Field Crew is involved
- Uses consistent status colors from the existing palette

### Updated: `ChangeOrderDetailPage`

- Replace `AppLayout` with custom layout using `SidebarProvider`, `AppSidebar`, `SidebarInset` (same pattern as ProjectHome)
- Add `WorkOrderTopBar` as the sticky header
- Add `WorkOrderProgressBar` below the header
- Merge `ChangeOrderHeader` and `ChangeOrderScopePanel` into a single combined card
- Reorder sidebar cards: Pricing first, then Approval, Checklist, Participants, Resources

### File Changes

| File | Change |
|---|---|
| `src/components/change-order-detail/WorkOrderTopBar.tsx` | New -- sticky top bar with project name, WO title, status, and navigable tabs |
| `src/components/change-order-detail/WorkOrderProgressBar.tsx` | New -- horizontal status progress indicator |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Update -- replace AppLayout with custom layout, add top bar and progress bar, reorganize card order, merge header + scope into one card |
| `src/components/change-order-detail/index.ts` | Update -- export new components |

### No Database Changes Required

All changes are purely frontend layout and component restructuring. No new queries, tables, or RLS policies needed.

