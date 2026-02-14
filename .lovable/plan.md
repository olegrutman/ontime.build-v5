

# Collapse Project Top Bar on Mobile, Tablet, and Small Laptop

On screens below desktop (< lg / 1024px), the `ProjectTopBar` currently still shows the project name, status dropdown, and notification bell -- even though the BottomNav now handles tab navigation. This change hides the entire `ProjectTopBar` on those smaller screens, keeping the view clean and relying on the BottomNav for context.

## What Changes

### 1. Hide `ProjectTopBar` on screens below lg

In `src/pages/ProjectHome.tsx`, wrap the `<ProjectTopBar>` in a `div` with `hidden lg:block` so it only renders on desktop (1024px+).

### 2. Hide `WorkOrderTopBar` tabs on screens below lg

In `src/components/change-order-detail/WorkOrderTopBar.tsx`, add `hidden lg:block` to the bottom tab row (lines 58-86) so the tab strip is hidden on mobile/tablet -- the BottomNav handles navigation there. The top row (breadcrumb, status, notifications) stays visible since the work order detail page needs a title bar.

### 3. Hide `SidebarTrigger` in `WorkOrderTopBar`

Add `hidden lg:flex` to the `SidebarTrigger` in `WorkOrderTopBar.tsx` (line 34), consistent with other top bars.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/ProjectHome.tsx` | Wrap `ProjectTopBar` with `hidden lg:block` |
| `src/components/change-order-detail/WorkOrderTopBar.tsx` | Hide tab strip and SidebarTrigger on < lg |

## What Is NOT Changed
- Desktop behavior unchanged -- ProjectTopBar and tabs still fully visible
- BottomNav unchanged -- already handles mobile/tablet navigation
- No database, logic, or route changes

