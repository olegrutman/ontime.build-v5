

# Icon Rail Navigation — Understanding Confirmation

## What is being removed and what replaces it

**Removed:** The horizontal `<Tabs>` row inside `ProjectTopBar.tsx` (lines 146-248) — the scrollable tab strip with 11 text-label tabs. Also removed: the project-specific items in `BottomNav.tsx` that currently handle mobile project navigation via `?tab=` query params.

**Replaced with:**
- **Desktop (>=768px):** A 44px-wide vertical icon rail sitting between the global `AppSidebar` and the main content `SidebarInset`. Navy #162E52 background. Contains 11 icons in 4 groups separated by dividers.
- **Mobile (<768px):** A 56px bottom navigation bar with 5 items (Overview, Change Orders, Invoices, Orders, More). The More button opens a bottom sheet listing all remaining sections.

## All 11 sections, icons, groups, and routes

**Group 1 — Contract:**
1. Overview — `LayoutDashboard` — `/project/:id/overview`
2. Scope & Details — `ClipboardList` — `/project/:id/scope`
3. SOV — `DollarSign` — `/project/:id/sov`

[divider]

**Group 2 — Operations:**
4. Change Orders — `AlertTriangle` (delta/warning) — `/project/:id/change-orders`
5. RFIs — `MessageSquareMore` — `/project/:id/rfis`
6. Estimates — `FileText` — `/project/:id/estimates`

[divider]

**Group 3 — Billing:**
7. Invoices — `Receipt` — `/project/:id/invoices`
8. Purchase Orders — `Package` — `/project/:id/purchase-orders`
9. Returns — `RotateCcw` — `/project/:id/returns`

[divider]

**Group 4 — Field:**
10. Schedule — `CalendarDays` — `/project/:id/schedule`
11. Daily Log — `PenLine` — `/project/:id/daily-log`

`/project/:id` redirects to `/project/:id/overview`.

## Active, hover, and badge states

- **Active:** 32x32 touch target with amber (#F5A623) background, 8px border-radius. Icon stroke changes to navy #0D1F3C.
- **Hover:** rgba(255,255,255,0.1) background. Icon stroke brightens to rgba(255,255,255,0.7).
- **Inactive:** No background. Icon stroke rgba(255,255,255,0.45).
- **Badge:** 7px red (#DC2626) dot, top-right corner, 1.5px border matching rail background (#162E52).

## Tooltip behavior

On hover, a tooltip appears 150ms after hover starts, to the right of the icon. Navy #0D1F3C background, white text, 10px font, 4px 8px padding, 4px border-radius, left-pointing arrow. Full section name, never truncated.

## Mobile collapse and More bottom sheet

Below 768px the icon rail is hidden. A 56px bottom bar appears (#0D1F3C background) with 5 items:
1. Overview (grid icon)
2. Change Orders (with badge)
3. Invoices (with badge)
4. Orders (package icon)
5. More (hamburger → opens bottom sheet)

Icons 20px, labels 9px. Active = amber. Inactive = rgba(255,255,255,0.35). Badges = 7px red dot.

The More bottom sheet slides up, lists all remaining sections with full names and badges. Tap navigates and closes sheet.

## Nothing inside any section content changes

Confirmed. All section components (Overview cards, SOV editor, CO list, RFI list, Invoices tab, etc.) render identically. Only the navigation mechanism changes.

## URL routing and redirect

Each section becomes a real route (`/project/:id/overview`, `/project/:id/scope`, etc.) instead of `?tab=` query params. `/project/:id` redirects to `/project/:id/overview`. Browser back/forward works. The `activeTab` logic in `ProjectHome.tsx` is replaced by reading the route segment.

Existing routes like `/project/:id/sov` and `/project/:id/details-wizard` continue to work. The CO detail route (`/projects/:projectId/change-orders/:coId`) is unchanged.

## First-time tooltip reveal

On first visit after deployment, all tooltip labels appear expanded (visible without hover) for 3 seconds, then fade to hover-only. Stored in `localStorage` (`project-rail-onboarded`). Fires once per user per device.

## Assumptions

1. **Feature gating** still applies — if a feature (e.g. `schedule_gantt`) is disabled, its icon is hidden from the rail. The groups and dividers adjust.
2. **Supplier role** hides SOV icon (matches current behavior where SOV tab is hidden for suppliers).
3. The topbar (project name, status, download, notifications) remains as a horizontal bar above both the icon rail and content area — it spans the full width of `SidebarInset`.
4. The global `AppSidebar` (left sidebar) is untouched. The icon rail is a separate component nested inside `SidebarInset`.
5. The existing `BottomNav` component continues to work on non-project pages (dashboard, partners, etc.). On project pages, the project-specific bottom bar replaces it.
6. Routes use `/project/:id/...` (singular, matching the existing pattern) rather than `/projects/:id/...` from the spec, since the app already uses `/project/`.

---

## Technical Plan

### New files

| File | Purpose |
|------|---------|
| `src/components/project/ProjectIconRail.tsx` | The 44px vertical icon rail component |
| `src/components/project/ProjectBottomNav.tsx` | Mobile 56px bottom bar + More sheet |

### Modified files

| File | Change |
|------|--------|
| `src/App.tsx` | Add nested routes under `/project/:id/*` for each section; redirect `/project/:id` → `/project/:id/overview` |
| `src/pages/ProjectHome.tsx` | Replace `?tab=` query param logic with `useParams` route segment; render `ProjectIconRail` + `Outlet` pattern; remove `handleTabChange` tab switching; pass route-based active section to icon rail |
| `src/components/project/ProjectTopBar.tsx` | Remove the entire bottom tabs row (lines 146-248); remove `activeTab`/`onTabChange` props; keep the top header row |
| `src/components/layout/BottomNav.tsx` | On project pages, render `ProjectBottomNav` instead of current project tab items |
| `src/components/project/index.ts` | Export new components |

### Routing approach

Instead of a single `ProjectHome` that conditionally renders sections based on `?tab=`, restructure as:
- `/project/:id` → redirect to `/project/:id/overview`
- `/project/:id/overview` → Overview content
- `/project/:id/scope` → ScopeDetailsTab
- `/project/:id/change-orders` → COListPage
- etc.

The `ProjectHome` becomes a layout wrapper with the icon rail + `<Outlet />`, and each section becomes a child route.

All internal navigation calls (`onNavigate('invoices')`, `handleTabChange('change-orders')`) are updated to use `navigate(`/project/${id}/invoices`)` instead of `setSearchParams({ tab: 'invoices' })`.

