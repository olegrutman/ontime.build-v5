

# Restructure Dashboard Sidebar

## What I'm Building

Redesigning the `DashboardSidebar` to be the primary navigation hub on desktop, moving the logo, profile, and sign-out from the top `ContextBar` into the sidebar. The page content will extend to the top of the viewport (no fixed header gap on desktop dashboard pages).

## Layout Changes

### DashboardSidebar — new structure (top to bottom):

1. **OnTime Logo** — `OntimeLogo` + "Ontime.build" text at the top
2. **Nav items** — Dashboard, Partners, Purchase Orders, Reminders, My Team, Settings (existing)
3. **Company section** (middle) — Organization name + org type badge, pulled from `useAuth`
4. **Profile + Sign Out** (bottom, anchored) — User avatar + name, sign-out button

### ContextBar — desktop changes:

- Hide logo on desktop (`lg:hidden`) since it's now in the sidebar
- Hide profile dropdown on desktop (`lg:hidden`) since it's now in the sidebar
- Keep Search, Notifications, and New Project button in the top bar

### AppShell / Dashboard.tsx — remove top padding:

- On dashboard pages with sidebar, remove the `pt-[52px]` top padding on desktop so content starts at the very top
- The ContextBar still shows on mobile (unchanged)

## Files Changed

| File | Change |
|------|--------|
| `src/components/app-shell/DashboardSidebar.tsx` | Add logo, org name, profile/sign-out sections; accept auth data |
| `src/components/app-shell/ContextBar.tsx` | Hide logo + profile avatar on `lg:` when sidebar is present |
| `src/pages/Dashboard.tsx` | Adjust layout so sidebar spans full height from top of page |

### What is NOT changing
- Mobile layout (bottom nav, top bar all stay)
- Non-dashboard pages (Settings, Partners, etc. keep current layout)
- Database, routes, RLS

