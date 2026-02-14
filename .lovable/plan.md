
# Bottom Navigation Bar for Mobile and Tablet

On screens smaller than desktop (below 1024px), replace the sidebar with a fixed bottom navigation bar. The items shown change based on context:

- **Dashboard/general pages**: Dashboard, Financials, Partners, My Team, Reminders
- **Project pages** (`/project/:id`): Dashboard (back), Overview, SOV, Work Orders, Invoices, POs

On desktop (1024px+), the sidebar continues to work as it does today.

## What Changes

### 1. Create `src/components/layout/BottomNav.tsx` (new file)

A fixed bottom bar (`fixed bottom-0 left-0 right-0 z-50`) visible only on mobile/tablet (`lg:hidden`). Contains:
- 5 icon+label buttons in a row, evenly spaced
- Detects current route using `useLocation()` to determine context (project vs dashboard)
- **Dashboard context** items: Dashboard (Home icon), Financials (DollarSign), Partners (Handshake), My Team (Users), Reminders (Bell)
- **Project context** items: Dashboard (Home -- navigates to /dashboard), Overview, SOV, WOs, Invoices, POs (navigates via `?tab=` params on current project URL)
- Active item highlighted with primary color
- Respects role visibility (e.g., hide My Team if user lacks `canManageOrg`)

### 2. Hide sidebar on mobile/tablet

In `AppSidebar.tsx`, wrap the entire `<Sidebar>` with a `hidden lg:block` so it only renders on desktop. The `SidebarTrigger` in `TopBar.tsx` and `ProjectTopBar.tsx` will also be hidden on mobile/tablet (`hidden lg:block`).

### 3. Hide project tab strip on mobile/tablet

In `ProjectTopBar.tsx`, hide the bottom tab row (`<div className="relative pb-2">`) on mobile/tablet (`hidden lg:block`) since the bottom nav replaces it.

### 4. Add BottomNav to layouts

- In `AppLayout.tsx`: Add `<BottomNav />` after `</SidebarInset>`, inside the SidebarProvider
- In `ProjectHome.tsx`: Add `<BottomNav />` similarly in each render branch

### 5. Adjust bottom padding

The existing `pb-20` on main content areas already accounts for floating elements -- this will naturally provide clearance for the bottom nav bar.

## Files Modified

| File | Change |
|------|--------|
| `src/components/layout/BottomNav.tsx` | New -- context-aware bottom navigation bar |
| `src/components/layout/AppSidebar.tsx` | Hide on mobile/tablet with `hidden lg:block` |
| `src/components/layout/TopBar.tsx` | Hide SidebarTrigger on mobile/tablet |
| `src/components/project/ProjectTopBar.tsx` | Hide SidebarTrigger and tab strip on mobile/tablet |
| `src/components/layout/AppLayout.tsx` | Add BottomNav component |
| `src/pages/ProjectHome.tsx` | Add BottomNav component |
| `src/components/layout/index.ts` | Export BottomNav |

## Technical Details

The BottomNav component will:
- Use `useLocation()` to detect if on a project page (path starts with `/project/`)
- Extract the project ID and current tab from URL params
- Use `useAuth()` to check `canManageOrg` for My Team visibility
- Use `useNavigate()` for navigation
- Render as a `nav` element with `h-16` and `bg-card border-t`
- Each item: flex-col, icon (20px) + label (text-[10px]), with `min-h-[44px]` tap target

## What Is NOT Changed
- Desktop sidebar behavior unchanged
- No database, logic, or permissions changes
- No route changes
