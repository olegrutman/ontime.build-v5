

# Dashboard & Project Overview — Refinement Plan

## What I see in the mockup screenshots vs current code

The screenshots show the mockup rendering with:
1. A **top bar** with "PORTFOLIO DASHBOARD" label + personalized greeting ("Good morning, Oleg") + search + orange "+ New" button
2. A **dark project header** on overview with project name, address, health/status badges
3. A **sticky tab bar** (Overview, Change Orders, Invoices, Purchase Orders, Returns, Schedule, Daily Log) with orange underline on active tab
4. **Health banner** with reason cards in a 2x2 grid
5. **5 financial KPIs** in a 2-column then single-column layout
6. **Materials Command Center** with 6 stat tiles + 3 alert tiles
7. **Pack Progress** with progress bars and status labels
8. **Action Queue** with "Go" links

## What is currently missing or wrong

### Dashboard (`Dashboard.tsx`)
1. **No personalized greeting** — the mockup shows "Good morning, Oleg" prominently at the top. `DashboardWelcome` component exists but is NOT rendered in current Dashboard.tsx
2. **No "+ New" project button** in the top bar — `AppLayout` supports `showNewButton`/`onNewClick` props but Dashboard doesn't pass them
3. **Business Snapshot card is in right sidebar** — mockup shows it at the TOP before KPIs as the hero section. Currently it's buried in the right column below the main grid
4. **No sidebar navigation** — mockup shows a dark navy sidebar with nav items (Dashboard, Projects, Work Orders, Invoices, POs, Returns, Documents, Settings). Current app uses only a top context bar + mobile bottom nav
5. **No Pack Progress on dashboard** — `PackProgressSection` exists but is never rendered on the dashboard (no data source wired)
6. **Materials Health uses fake data** — `DashboardMaterialsHealth` receives `financials.totalRevenue` as estimate and `financials.paidByYou` as ordered, which are NOT material figures. Should aggregate real material data from projects
7. **DashboardBusinessSnapshot missing pending CO and open PO counts** — currently hardcoded to 0

### Project Overview (`ProjectHome.tsx`)
8. **No dark project header** — mockup shows `bg-slate-950` dark section with project name, address, health badge, status badge. Current overview jumps straight to health banner
9. **No sticky tab bar** — mockup shows a text-based sticky tab bar below the dark header. Current implementation uses the `ProjectIconRail` (icon-only sidebar on desktop) which is different from the mockup
10. **Materials Command Center doesn't use real pack data** — `MaterialsCommandCenter` uses `useProjectFinancials` which has basic material totals but NO pack-level breakdown, no unmatched items, no packs-not-started count. The rich logic exists in `useSupplierMaterialsOverview` but is only used for the supplier view
11. **Pack Progress not shown on overview** — `PackProgressSection` is available but not rendered in the project overview layout
12. **Items not collapsible** — when lists get long (POs, packs, action queue, attention items), there's no show-more/collapse behavior
13. **PO Summary is a table** — works fine on desktop but mockup suggests card-based for mobile; current table lacks mobile card fallback

## Implementation approach

### A. Dashboard changes

1. **Add greeting header** — render `DashboardWelcome` at the top of the dashboard with user's first name from `profile`. Show "PORTFOLIO DASHBOARD" as an uppercase label above
2. **Pass `showNewButton` + `onNewClick` to AppLayout** — enables "+ New" button in ContextBar for project creation
3. **Move Business Snapshot to top** — place `DashboardBusinessSnapshot` as the first major element after KPIs (or above them as a hero). Wire `pendingCOCount` and `openPOCount` from `useDashboardData` (need to add these counts to the hook or compute from `recentDocs`)
4. **Add desktop sidebar** — create `DashboardSidebar.tsx` with dark navy styling matching mockup: nav items for Dashboard, Projects, Invoices, Purchase Orders, Returns, Settings. Collapsible to icon-only on medium screens. Hidden on mobile (bottom nav handles it). Update `AppShell` to render sidebar when on dashboard route
5. **Wire real material data** — `useDashboardData` should aggregate `materialEstimateTotal`, `materialOrdered`, `materialDelivered` across projects. If not available, we pass the hook data we have and clearly label approximations

### B. Project Overview changes

6. **Add dark project header** — create `ProjectDarkHeader.tsx` rendered at the top of overview tab with project name, formatted address, health badge, status badge. Uses `bg-slate-950 text-white`
7. **Add sticky text tab bar** — create `ProjectTabBar.tsx` that renders below the dark header as a horizontally scrollable text-based tab strip with orange underline on active. Sticky below the context bar (top-16). This replaces visual navigation on the overview page while keeping `ProjectIconRail` for other tabs
8. **Enhance MaterialsCommandCenter** — use `useSupplierMaterialsOverview` data when supplier org is available to get: pack comparisons, unmatched items, packs not started, forecast. For non-supplier views, compute from PO data similarly. Add pack-level rows showing which packs are ordered and which are over budget
9. **Add PackProgressSection to overview** — fetch pack data from estimate items + PO status, compute pack statuses (delivered/ordered/not_ordered/partial), render with progress bars in the right column
10. **Collapsible lists** — add "show more" toggle to any list section with >3 items (PO table, pack progress, action queue, attention list). Default to showing 3 items with a "Show all (N)" button

### C. Shared components

11. **DashboardSidebar.tsx** — dark navy sidebar for desktop. Items: Dashboard, Projects, Invoices, Purchase Orders, Returns, Documents, Settings. Each item navigates to the appropriate route. Collapsible icon-only on `lg`, expanded on `xl`. Mobile: hidden (use existing `MobileBottomNav`)

## Files to create
| File | Purpose |
|------|---------|
| `src/components/app-shell/DashboardSidebar.tsx` | Desktop sidebar navigation (dark navy) |
| `src/components/project/ProjectDarkHeader.tsx` | Dark header for project overview |
| `src/components/project/ProjectTabBar.tsx` | Sticky text tab bar for project overview |

## Files to modify
| File | Changes |
|------|---------|
| `Dashboard.tsx` | Add greeting, pass showNewButton, move BusinessSnapshot to top, render sidebar layout |
| `AppShell.tsx` | Optionally render sidebar on dashboard pages |
| `DashboardBusinessSnapshot.tsx` | Wire `pendingCOCount` and `openPOCount` props (already has them but they're unused) |
| `MaterialsCommandCenter.tsx` | Accept optional pack data, show pack-level breakdown, unmatched items, packs not started from real hooks |
| `ProjectHome.tsx` | Add dark header + sticky tab bar to overview, add PackProgressSection, wire enhanced MaterialsCommandCenter |
| `DashboardAttentionList.tsx` | Collapse to 3 items with "Show all" toggle |
| `DashboardActionQueue.tsx` | Collapse to 3 items with "Show all" toggle |
| `ProjectPOSummary.tsx` | Collapse to 3 rows with "Show all" toggle |
| `PackProgressSection.tsx` | Collapse to 3 packs with "Show all" toggle |

## Hook reuse
- `useDashboardData` — all dashboard data (may add CO/PO counts)
- `useProjectFinancials` — project-level financials
- `useSupplierMaterialsOverview` — rich pack/material data (reuse for MaterialsCommandCenter)
- `useProjectEstimateRows` — estimate pack data
- `useProfile` — for greeting first name
- `useAuth` — roles, permissions

## Implementation order
1. Add greeting + "+ New" button to dashboard
2. Create `DashboardSidebar` + integrate into `AppShell`
3. Move BusinessSnapshot to top, wire CO/PO counts
4. Create `ProjectDarkHeader` + `ProjectTabBar` for overview
5. Enhance `MaterialsCommandCenter` with pack data from hooks
6. Add `PackProgressSection` to project overview with real data
7. Add collapse/expand to all list components (>3 items)

