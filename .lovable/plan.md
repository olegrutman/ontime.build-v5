

# Fix Dashboard Links & Add Missing Sidebar Items

## Bugs Found

1. **"See all projects" link in `DashboardAttentionList`** points to `/dashboard` (self-link, does nothing). Should scroll down to the `ProjectSnapshotList` section on the same page.

2. **Sidebar is missing key nav items** from the mockup. Currently has: Dashboard, Partners, Reminders, My Team, Settings. Missing: **Invoices** (no standalone route exists), **Purchase Orders** (`/purchase-orders` route exists), **Returns** (no standalone route).

3. **`DashboardMaterialsHealth` uses wrong data** — passes `financials.totalRevenue` as material estimate and `financials.paidByYou` as ordered. These are revenue/payment figures, not material data.

4. **Business Snapshot and Materials Health cards are not clickable** — no drill-down navigation.

## Plan

### 1. Fix "See all projects" link
In `DashboardAttentionList.tsx`, change the button from `navigate('/dashboard')` to scroll to the projects section using a ref or anchor ID. Add `id="projects-list"` to the `ProjectSnapshotList` wrapper in `Dashboard.tsx`, then use `document.getElementById('projects-list')?.scrollIntoView({ behavior: 'smooth' })`.

### 2. Add missing sidebar items
Update `DashboardSidebar.tsx` NAV_ITEMS to include Purchase Orders (`/purchase-orders` with `Package` icon). Skip Invoices and Returns since no standalone routes exist for those yet — adding dead links would be worse than omitting them.

### 3. Fix Materials Health data
In `Dashboard.tsx`, compute real material totals by summing `materialEstimateTotal` and `materialOrdered` from each project's financials (if available in `useDashboardData`). If not available at the dashboard level, pass the existing data but label it as "Cost" instead of "Estimate" to avoid misleading users. Check `useDashboardData` for what material fields are actually available.

### 4. Make cards clickable
- Business Snapshot: clicking the active projects count navigates to the projects section (same scroll behavior)
- Materials Health: no standalone materials page exists, so skip this for now

### Files to modify
| File | Change |
|------|--------|
| `DashboardAttentionList.tsx` | Fix "See all projects" to scroll to `#projects-list` |
| `Dashboard.tsx` | Add `id="projects-list"` to ProjectSnapshotList wrapper, fix MaterialsHealth data props |
| `DashboardSidebar.tsx` | Add Purchase Orders nav item |

