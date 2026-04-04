

# Unify Navigation & Merge Project Cards

## What I learned

**Project Overview page has two redundant navs:**
1. `ProjectIconRail` — 44px vertical icon sidebar (left edge) with project-level links (Overview, Change Orders, Invoices, POs, etc.)
2. `ProjectTabBar` — sticky horizontal tab bar under the dark header with the same links

Both navigate to the same tabs. Redundant.

**Dashboard has two project cards:**
1. `DashboardAttentionList` — "Projects needing attention" (groups by project, shows issues, links to project)
2. `ProjectSnapshotList` — Full project list with status filter tabs (Setup/Active/On Hold/Completed/Archived)

Both show projects. Redundant.

## Plan

### 1. Replace ProjectIconRail with DashboardSidebar-style sidebar

- **Delete** `ProjectIconRail` from `ProjectHome.tsx`
- **Create** `ProjectSidebar.tsx` — same visual style as `DashboardSidebar` (dark bg, 200/220px width, rounded-xl buttons, text labels) but with project-level nav items:
  - Overview, Project Info, Schedule of Values, Change Orders, RFIs, Estimates, Invoices, Purchase Orders, Returns, Schedule, Daily Log
  - Same feature-gating logic as the current icon rail
  - A "← Back to Dashboard" link at the top
- **Keep** `ProjectTabBar` for **mobile only** (hidden on `lg:` and up) since the sidebar is `hidden lg:flex`. This gives mobile users horizontal tab navigation and desktop users the sidebar.

### 2. Merge two dashboard project cards into one

- **Delete** `DashboardAttentionList` as a separate card
- **Redesign** `ProjectSnapshotList` → rename to **"Projects in Progress"**
- New unified card behavior:
  - **Default view**: Shows active projects, each row includes the project name, type, contract value, AND attention indicators (inline `StatusPill` for "Watch"/"At Risk" if the project has pending issues)
  - **Status filter**: Keep the existing `StatusMenu` pill tabs (Active / On Hold / Completed / Archived) but make them compact inline pills inside the card header instead of a full-width bar
  - **Title**: "Projects in Progress" when showing Active, changes contextually ("On Hold Projects", "Completed Projects", etc.)
  - Attention data merges into each project row — no separate card needed

### 3. Files to modify

| File | Change |
|------|--------|
| `ProjectHome.tsx` | Remove `ProjectIconRail` import/usage, add `ProjectSidebar`, hide `ProjectTabBar` on desktop (`lg:hidden`) |
| **New** `ProjectSidebar.tsx` | Dark sidebar matching `DashboardSidebar` style, project-level nav items with feature gates |
| `ProjectTabBar.tsx` | Add `className="lg:hidden"` wrapper so it only shows on mobile |
| `Dashboard.tsx` | Remove `DashboardAttentionList`, pass attention data into `ProjectSnapshotList` |
| `ProjectSnapshotList.tsx` | Rename title to "Projects in Progress", merge attention indicators into each project row as inline `StatusPill`, make status filter pills compact |
| `DashboardAttentionList.tsx` | Can be deleted (or kept unused) |
| `StatusMenu.tsx` | Compact the filter pills to fit inside a card header row |

### What is NOT changing
- No business logic changes
- Dashboard sidebar stays as-is
- Mobile bottom nav for project pages stays
- Dark header on project overview stays
- All existing routing/tab content stays

