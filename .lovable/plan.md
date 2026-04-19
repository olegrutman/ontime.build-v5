

User wants Projects between Hero (top) and KPI cards on mobile. Adjust the previous plan: keep Hero at top, then Projects, then KPIs/rest.

## Mobile order
1. DashboardHero (banner)
2. My Projects
3. KpiGrid + Attention + everything else

Desktop unchanged: Hero → KPIs → … → Projects.

## Change
Convert outer container `space-y-4` → `flex flex-col gap-4` and add Tailwind `order-*` classes:
- Hero: `order-1` (default everywhere)
- Projects block: `order-2 md:order-last`
- KPI/attention/rest: `order-3 md:order-2`

## Files
- `src/components/dashboard/TCDashboardView.tsx`
- `src/components/dashboard/GCDashboardView.tsx`
- `src/components/dashboard/FCDashboardView.tsx`

## Verification
- 390px: Banner → Projects → KPIs
- ≥768px: unchanged (Banner → KPIs → … → Projects)
- Empty-projects state: block doesn't render, no gap

