

# Fix Supplier Dashboard — Project Navigation Bug

## Problem

The `SupplierDashboardView` has **no working project navigation**. Every clickable project element (table rows, project cards, "Active Projects" grid) uses `onClick={() => {}}` — an empty stub. The underlying data arrays (`dp`) also lack project IDs, making navigation impossible even if handlers were wired.

## Bugs Found

| # | Location | Bug |
|---|----------|-----|
| 1 | `SupplierDashboardView.tsx` line 317 | KPI card table rows: `onClick={() => {}}` — does nothing |
| 2 | `SupplierDashboardView.tsx` line 504 | Budget Forecast table rows: `onClick={() => {}}` — does nothing |
| 3 | `SupplierDashboardView.tsx` line 529 | Active Projects `ProjectCard`: `onClick={() => {}}` — does nothing |
| 4 | `SupplierDashboardView.tsx` lines 256-267 | The `dp` array (derived from `projectFinancials` or `DEMO_PROJECTS`) has no `projectId` field, so navigation targets are unknown |
| 5 | `DEMO_PROJECTS` (line 223) | Demo data has no `id` field to navigate to |

## Fix

### File: `src/components/dashboard/SupplierDashboardView.tsx`

1. **Add `projectId` to the `dp` data shape** — when mapping from `projectFinancials`, carry `p.projectId`. For demo data, add placeholder IDs.

2. **Wire all `onClick` handlers** to `navigate(\`/project/${dp[i].projectId}\`)`:
   - KPI card table rows (Cards 1-6)
   - Budget Forecast table rows
   - Active Projects `ProjectCard` grid

3. **Wire "Full Schedule →" link** in the Scheduled Deliveries section to navigate to a relevant view (or leave as-is if no delivery page exists).

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/SupplierDashboardView.tsx` | Add `projectId` to `dp` items; wire all empty `onClick` stubs to `navigate(/project/{id})` |

