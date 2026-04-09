

# Remove Sticky Tab Bar on Mobile

## Problem
On mobile, there are two navigation elements: the horizontal scrollable tab bar ("Overview | Change Orders | Invoices | Purch...") below the dark header AND the bottom nav bar. This is redundant — the bottom nav already handles section switching.

## Change
Remove the `ProjectTabBar` from the sticky header block in `ProjectHome.tsx`. Since `ProjectTabBar` is exclusively for `lg:hidden` (mobile/tablet only) and the bottom nav already covers navigation, removing it eliminates the redundancy.

### File Changed

| File | Change |
|------|--------|
| `src/pages/ProjectHome.tsx` | Remove the `<ProjectTabBar>` component from the sticky header block (line 325) |

The dark header (project name, status, health) stays — only the tab bar strip below it is removed.

