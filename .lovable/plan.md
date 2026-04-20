
## Plan — "Projects Archive" page

A dedicated page where the user can browse all their non-active projects (Completed, On Hold, Archived) in one place, separate from the dashboard's active-focused view.

### Route
- New route: `/projects/archive` (renders `ProjectsArchive.tsx`)
- Add a "Projects" entry to the desktop sidebar (`DashboardSidebar.tsx`) using the `FolderKanban` icon, pointing to `/projects/archive`.

### Page layout (`src/pages/ProjectsArchive.tsx`)
Wrapped in `AppLayout` so it sits inside the standard shell with sidebar.

- **Header**: title "Projects" + subtitle "Completed, on hold, and archived projects". Search input (filter by name).
- **Status tabs**: `Completed`, `On Hold`, `Archived`, `All` — each with a count badge. Default tab = `Completed`. Uses the same dot-color system as the dashboard (`STATUS_DOT_COLORS`).
- **Project list**: reuse the existing `DashboardProjectList` accordion cards for visual consistency. Each card shows name, type, contract value, status, and the same expand-to-show-actions behavior. From the actions menu the user can:
  - Set Active (returns project to active list)
  - Put On Hold / Mark Completed (move between non-active statuses)
  - Archive / Unarchive
  - View Project (navigates to `/project/:id`)
- **Empty state** per tab (e.g. "No archived projects").

### Data
Reuse `useDashboardData()` — it already returns all projects across statuses + `statusCounts`, plus `refetch`. We just filter to `completed | on_hold | archived` and feed into `DashboardProjectList`. The same archive/unarchive/status handlers from `Dashboard.tsx` are duplicated minimally (or extracted into a small hook `useProjectStatusActions` shared by both pages — preferred).

### Files
1. **New** `src/pages/ProjectsArchive.tsx` — page component
2. **New** `src/hooks/useProjectStatusActions.ts` — extract the archive/unarchive/status-change handlers currently inline in `Dashboard.tsx` so both pages stay in sync
3. **Edit** `src/pages/Dashboard.tsx` — swap inline handlers for the new hook (no behavior change)
4. **Edit** `src/App.tsx` — add `<Route path="/projects/archive" …>`
5. **Edit** `src/components/app-shell/DashboardSidebar.tsx` — add "Projects" nav item
6. **Edit** `src/components/app-shell/MobileBottomNav.tsx` — optional: not changed (keep nav slim); accessible via sidebar/command palette

### Verification
- Navigate to /projects/archive from sidebar.
- Tabs show correct counts; switching tabs filters list.
- Clicking a project opens its overview.
- Archive/unarchive/status changes update both this page and dashboard counts after refetch.
- Search filters by name.
- Empty states render when a tab has 0 items.
