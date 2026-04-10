

# Align All KPI Grids to 4-Column Layout

## Summary
Three dashboard views and two overview views still use 3-column KPI grids. Change them all to `repeat(4, 1fr)` / `lg:grid-cols-4` to match the GC Dashboard, GC Overview, and TC Overview which already use 4 columns.

## Changes

| # | File | Line | Current | New |
|---|------|------|---------|-----|
| 1 | `TCDashboardView.tsx` | 297 | `lg:grid-cols-3` | `lg:grid-cols-4` |
| 2 | `GCDashboardView.tsx` | 325 | `lg:grid-cols-3 xl:grid-cols-4` | `lg:grid-cols-4` (drop xl breakpoint, always 4 on lg+) |
| 3 | `FCDashboardView.tsx` | 300 | `repeat(3, 1fr)` | `repeat(4, 1fr)` |
| 4 | `FCProjectOverview.tsx` | 220 | `repeat(3, 1fr)` | `repeat(4, 1fr)` |
| 5 | `SupplierProjectOverview.tsx` | 301 | `repeat(3, 1fr)` | `repeat(4, 1fr)` |
| 6 | `DashboardKPIs.tsx` | 45 | `md:grid-cols-3` (FC section) | `md:grid-cols-4` + add a 4th KPI card (e.g. "Pending" = totalRevenue − paidToYou, already computed) |

All responsive breakpoints stay consistent: `max-lg:!grid-cols-2 max-sm:!grid-cols-1` (inline style views) or `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (Tailwind views).

**Card counts**: TC Dashboard has 8 cards (fills 2 rows of 4 perfectly). FC Dashboard has 6 cards (4+2). GC Dashboard already has 8 cards. FC Overview has 6 cards (4+2). Supplier Overview has 6 cards (4+2). The 4+2 layout is intentional and looks clean — the last 2 cards left-align on the final row.

