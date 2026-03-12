

# Dashboard Bugs — GC Contract Value Mismatch + Broken Link

## Bugs Found

### 1. "All Projects →" link is a 404
`DashboardProjectsTable.tsx` navigates to `/projects` but no such route exists in `App.tsx`. The console confirms: `404 Error: User attempted to access non-existent route: /projects`. There's no standalone projects list page — the closest is the dashboard itself or individual project pages at `/project/:id`.

**Fix:** Change the link to navigate to `/dashboard` (where projects are already listed), or remove the link entirely since the user is already viewing all projects on the dashboard.

### 2. GC per-project contract value includes Work Order contracts
In `useDashboardData.ts` line 352-357, for GC the `contractValue` sums ALL contracts where `to_org_id === currentOrg.id`. From the real data, this includes:
- Base contract: TC→GC `$500,000` (Framer)
- WO contract: TC→GC `$5,500` (Work Order)

The WO contract should be excluded because WO value is tracked separately via `change_order_projects`. This inflates the per-project value shown in the projects table.

**Fix:** Filter out `trade === 'Work Order'` and `trade === 'Work Order Labor'` contracts from the GC per-project sum, same way TC already does.

### 3. KPI "Contract Value" uses different formula than Portfolio Total
- **KPI** uses `financials.totalRevenue`, which for GC comes from `owner_contract_value` if available (lines 579-587), or falls back to `totalCosts` (which includes ALL contracts + WO values).
- **Portfolio Total** in the projects table sums `contractValue` per project (which is `contract_sum` of all to_org contracts including WOs).

These are fundamentally different numbers. The KPI should use the same base as the portfolio total: sum of base contract values (excluding WOs), optionally plus approved WO values.

**Fix:** 
- For GC `totalRevenue`: use `owner_contract_value` if available (per existing logic), but exclude WO trade contracts from the fallback path.
- For GC `totalCosts`: exclude WO trade contracts from the base sum (WO costs are added separately on line 599).
- Align KPI "Contract Value" to show the same number as Portfolio Total by using a consistent formula.

### 4. GC `totalCosts` double-counts WO values
Line 572-576 sums ALL contracts where `to_org_id === currentOrg.id` (including WO trade contracts like $5,500). Then line 599 adds WO `final_price` again from `change_order_projects`. This double-counts the WO value in `totalCosts`.

**Fix:** Apply the same `isBaseContract` filter that TC already uses (line 523-526) to exclude WO/WO Labor trade contracts from the GC base contract sum.

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/useDashboardData.ts` | Add WO trade filter to GC per-project contractValue (line 354) and GC financial summary (lines 572-576, 579-581) |
| `src/components/dashboard/DashboardProjectsTable.tsx` | Change `/projects` navigation to `/dashboard` or remove the link |

