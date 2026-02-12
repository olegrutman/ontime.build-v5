

# Make Sidebar Fully Collapsible on All Screens

The sidebar currently collapses to an "icon rail" (narrow strip showing only icons) on desktop/tablet, and uses a slide-out drawer on mobile. This change will make it fully collapsible (completely hidden) on all screen sizes, with the toggle button always visible in the top bar.

## What Changes

### 1. Switch collapse mode from "icon" to "offcanvas"
In `AppSidebar.tsx`, change `collapsible="icon"` to `collapsible="offcanvas"`. This makes the sidebar fully hide when collapsed instead of showing a narrow icon strip.

### 2. Ensure SidebarTrigger is always visible
The `SidebarTrigger` in `TopBar.tsx` is already always rendered -- no changes needed there. It will continue to toggle the sidebar open/closed.

### 3. Clean up icon-only conditional rendering
Since the sidebar will fully hide (not show icons), the `{!collapsed && ...}` guards on text labels in `AppSidebar.tsx` become unnecessary. However, keeping them is harmless and provides future flexibility, so they stay.

## Files Modified

| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Change `collapsible="icon"` to `collapsible="offcanvas"` on the Sidebar component |

## What Is NOT Changed
- No logic, permissions, database, or route changes
- TopBar and SidebarTrigger remain unchanged
- Mobile drawer behavior remains the same (already offcanvas-style)
- All sidebar content (nav items, footer) unchanged
