

# Dashboard Bugs & Fixes

## Bug 1: Recent Documents Card is Static
`DashboardRecentDocs.tsx` is hardcoded to always show "No recent documents". It never queries the database. The data exists -- network requests show 2 invoices and 3 change orders for the current project.

**Fix:** Wire up `DashboardRecentDocs` to accept real data from the dashboard. Query `invoices` and `change_order_projects` across all user projects in `useDashboardData.ts`, pass them as props, and render them as filterable rows (All / Invoices / Work Orders / Change Orders). Each row shows: document number/title, type badge, status badge, and amount.

## Bug 2: No Way to See All Project Statuses
`DashboardProjectsTable.tsx` (line 40) filters to only non-archived projects and labels the section "Active Projects". There is no status filter UI. The full `DashboardProjectList` component with status tabs (setup/active/on_hold/completed/archived) exists but is never used on the dashboard.

**Fix:** Replace `DashboardProjectsTable` on the dashboard with `DashboardProjectList`, passing in the existing `statusCounts` data and filter state. This gives users the collapsible status menu on mobile and the horizontal pill tabs on desktop to browse all project statuses.

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/useDashboardData.ts` | Add query for recent documents (invoices + change orders across all user projects), return as `recentDocs` |
| `src/components/dashboard/DashboardRecentDocs.tsx` | Accept `docs` prop, render real rows with type/status badges and amounts, filtered by tab selection |
| `src/pages/Dashboard.tsx` | Replace `DashboardProjectsTable` with `DashboardProjectList`, add `statusFilter` state, pass `statusCounts`/filter/callbacks. Pass `recentDocs` to `DashboardRecentDocs`. |

## Implementation Details

**Recent docs data shape:**
```ts
{ id, type: 'invoice'|'work_order'|'change_order', title, status, amount, created_at, projectName }
```

**Dashboard state additions:**
- `statusFilter` state (default: 'active')
- Pass existing `projects`, `statusCounts`, archive/unarchive/statusChange handlers to `DashboardProjectList`

