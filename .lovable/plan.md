

# Remove GC Dashboard from Platform Owner Site

## Changes

### 1. `src/components/platform/PlatformSidebar.tsx`
- Remove the nav item `{ to: '/platform/gc-dashboard', icon: BarChart3, label: 'GC Dashboard' }` from the `NAV_ITEMS` array (line 27).
- Remove the `BarChart3` import if it's no longer used by any remaining nav item (it's still used by KPI Cards on line 26, so keep it).

### 2. `src/App.tsx`
- Remove the route `<Route path="/platform/gc-dashboard" ...>` (line 218).
- Remove the `PlatformGCDashboard` import if it becomes unused.

## Files Changed

| File | Change |
|------|--------|
| `src/components/platform/PlatformSidebar.tsx` | Remove GC Dashboard nav item |
| `src/App.tsx` | Remove GC Dashboard route and unused import |

