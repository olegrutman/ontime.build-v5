

# Redesign Dashboard Project List to Match New Design System

## Problem
The current `DashboardProjectList` + `ProjectRow` + `StatusMenu` were built as a standalone project management view. They use individual cards per project, chunky pill-style status tabs, and an expand/collapse pattern with `ProjectQuickOverview`. This looks like a foreign widget dropped into the clean, dense dashboard.

## Solution
Rewrite `DashboardProjectList` as a single card container (matching `DashboardRecentDocs` style) with:
- **Header**: "Projects" title (Barlow Condensed, uppercase) + item count — same pattern as Recent Documents
- **Status filter tabs**: Small inline buttons matching the Recent Documents filter tabs (not the big pill StatusMenu)
- **Project rows**: Dense stacked rows inside the card (no individual card borders), separated by `divide-y`. Each row shows:
  - Status dot (8px, color-coded) + project name (.82rem 600) + contract value right-aligned
  - Project type + role + status badge + pending actions badge on second line
  - Tap navigates to project (no expand/collapse — that belongs on a dedicated projects page, not a dashboard summary)
- **3-dot menu**: Keep archive/unarchive/status change actions per row
- **Mobile**: Same stacked row pattern, min-height 56px, full touch targets
- **Empty state**: Centered emoji + message matching the new pattern

## Files to Change

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardProjectList.tsx` | Full rewrite — single card, inline status tabs, dense rows. Remove `StatusMenu` and `ProjectRow` imports. Keep same props interface for Dashboard.tsx compatibility. |

No changes needed to `Dashboard.tsx`, `StatusMenu.tsx`, or `ProjectRow.tsx` (those can still be used elsewhere).

