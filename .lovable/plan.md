
# Conditional Quick Stats Tiles + Collapsible Status Bar on Mobile

## What Changes

### 1. Quick Stats tiles: only show tiles that need attention (count > 0)
- In `DashboardQuickStats.tsx`, filter the `tiles` array to only include tiles where `count > 0`
- If no tiles have counts > 0, render nothing (return `null`)
- This keeps the dashboard clean when everything is fine

### 2. Status bar: collapse on mobile, only expand when needed
- In `DashboardProjectList.tsx`, on mobile (sm and below), wrap `StatusMenu` in a `Collapsible` component
- Show a compact summary row (e.g., "Active (3)" with a chevron toggle) instead of the full tab strip
- Tapping expands to show all status options
- On desktop (sm+), show the full `StatusMenu` as it is today
- If a non-active status has items needing attention (e.g., setup count > 0), show a small dot/badge on the collapsed bar to hint the user should look

## Technical Details

### `src/components/dashboard/DashboardQuickStats.tsx`
- Filter: `const visibleTiles = tiles.filter(t => t.count > 0)`
- If `visibleTiles.length === 0`, return `null`
- Render `visibleTiles` instead of `tiles`
- Adjust grid: `grid-cols-1` when 1 tile, `grid-cols-2` when 2, `grid-cols-3` when 3 (use dynamic class)

### `src/components/dashboard/DashboardProjectList.tsx`
- Import `Collapsible, CollapsibleTrigger, CollapsibleContent` and `useIsMobile`
- On mobile: render a collapsible trigger showing current filter label + count + chevron
- `CollapsibleContent` wraps the existing `StatusMenu`
- On desktop (`!isMobile`): render `StatusMenu` directly as before
- When a status is selected from the expanded menu, auto-collapse

### `src/pages/Dashboard.tsx`
- No changes needed -- the components handle the conditional logic internally
