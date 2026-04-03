

# Dashboard + Project Overview Redesign — Matching Mockup

## What the mockup shows

The mockup is a single-page layout with two major sections stacked vertically:

**Dashboard (top half):**
- 4 KPI cards in a row (`rounded-3xl`, white bg, large numbers, subtitle text)
- 8/4 column split: left has "Projects needing attention" card + 2-col grid (Materials Health with bar chart + Action queue), right has dark navy "Business snapshot" card + Pack Progress card
- Clean `rounded-3xl` cards everywhere, `shadow-sm`, slate color palette

**Project Overview (bottom half):**
- Dark header (`bg-slate-950`) with project name, address, health badge
- Sticky tab bar below header
- Amber health banner with reason cards in a 4-col grid
- 5 financial KPI cards in a row
- 8/4 split: left has Materials Command Center (6-col stat grid + 3-col alert tiles) + PO table; right has CO Impact + Pack Progress with progress bars + Action Queue

## What needs to change

### Dashboard changes:
1. **PortfolioHealthHero** → Redesign as a dark navy sidebar card ("Business snapshot") with active project count + risk breakdown + key counts (unapproved invoices, pending COs, open POs)
2. **DashboardKPIs** → Update card style to `rounded-3xl` with larger padding and bigger numbers
3. **DashboardAttentionList** → Redesign as "Projects needing attention" with project-level risk items (name, issue description, At Risk/Watch badge)
4. **DashboardMaterialsHealth** → New component: Materials Health card with bar chart + Estimate/Ordered/Forecast mini-stats + Watch badge
5. **DashboardActionQueue** → Restyle as "Needs action today" with `rounded-2xl` action items
6. **Layout** → Switch to 8/4 grid with dark snapshot card on right

### Project Overview changes:
1. **Project header** → Dark `bg-slate-950` section with name, address, health badge, status badge
2. **ProjectHealthBanner** → Amber card with reason tiles in a responsive grid (not bullet list)
3. **ProjectFinancialCommand** → Expand to 5 KPIs (add "Approved CO Adds" + "Revised Contract")
4. **MaterialsCommandCenter** → Expand with 6 stat tiles (add Returns/Credits + Forecast Final) + 3 alert tiles (Packs not started, Unmatched materials, Unconfirmed deliveries)
5. **COImpactCard** → Expand to show 4 line items (Revenue, Cost, Margin, Pending Exposure)
6. Add **PackProgressSection** on right column with progress bars
7. Add **ProjectPOSummary** — inline table/card view of POs on overview tab
8. Add **OverviewTeamCard** back on the project overview (use existing `TeamMembersCard` or a streamlined read-only version)

### New components to create:
| Component | Location |
|-----------|----------|
| `DashboardMaterialsHealth.tsx` | `src/components/dashboard/` |
| `DashboardBusinessSnapshot.tsx` | `src/components/dashboard/` |
| `PackProgressSection.tsx` | `src/components/project/` |
| `ProjectPOSummary.tsx` | `src/components/project/` |
| `ProjectOverviewTeamCard.tsx` | `src/components/project/` |

### Existing components to restyle:
- `PortfolioHealthHero` → Remove (replaced by BusinessSnapshot)
- `DashboardKPIs` → `rounded-3xl`, larger padding
- `DashboardAttentionList` → Project-level risk items with badges
- `DashboardActionQueue` → "Needs action today" style
- `ProjectHealthBanner` → Reason grid cards instead of bullet list
- `ProjectFinancialCommand` → 5 KPIs, `rounded-3xl`
- `MaterialsCommandCenter` → 6+3 tile layout
- `COImpactCard` → 4 rows (revenue/cost/margin/pending)

### Dashboard.tsx layout update:
```
<DashboardKPIs />                     {/* 4-col row */}
<div grid 8/4>
  <div>                               {/* left 8-col */}
    <DashboardAttentionList />         {/* "Projects needing attention" */}
    <div grid 2-col>
      <DashboardMaterialsHealth />     {/* chart + stats */}
      <DashboardActionQueue />         {/* "Needs action today" */}
    </div>
  </div>
  <div>                               {/* right 4-col */}
    <DashboardBusinessSnapshot />      {/* dark navy card */}
    <PackProgressSection />            {/* dashboard-level packs */}
  </div>
</div>
```

### ProjectHome.tsx overview layout update:
```
<ProjectDarkHeader />                  {/* dark project header */}
<StickyTabBar />                       {/* already exists via ProjectIconRail */}
<ProjectHealthBanner />                {/* amber banner with reason grid */}
<ProjectFinancialCommand />            {/* 5 KPIs */}
<div grid 8/4>
  <div>
    <MaterialsCommandCenter />         {/* expanded 6+3 */}
    <ProjectPOSummary />               {/* PO table/cards */}
  </div>
  <div>
    <COImpactCard />                   {/* 4 rows */}
    <PackProgressSection />            {/* with progress bars */}
    <ProjectOverviewTeamCard />        {/* team card */}
    <ProjectActionQueue />
  </div>
</div>
```

### Visual tokens (matching mockup):
- Cards: `rounded-3xl bg-white border border-slate-200 shadow-sm`
- Inner cards/tiles: `rounded-2xl bg-slate-50 border border-slate-200`
- Section titles: `text-lg font-semibold tracking-tight` (not uppercase)
- Subtitles: `text-sm text-slate-500`
- KPI numbers: `text-3xl font-semibold tracking-tight`
- Status badges: `rounded-full px-3 py-1 text-xs font-semibold`
- Dark cards: `bg-[#0f172a] text-white rounded-3xl`
- Health banner: `rounded-3xl bg-amber-50 border border-amber-200`

### Team card on overview:
Create a lightweight `ProjectOverviewTeamCard` that:
- Fetches `project_team` with org names (reuse pattern from `TeamMembersCard`)
- Shows role dot + org name + role abbreviation per row
- Shows material responsibility indicator
- Shows designated supplier
- Links to full team management
- Fits in the right sidebar column

### Hooks reused (no changes):
- `useDashboardData` — all dashboard data
- `useProjectFinancials` — all project financial data
- `useProjectReadiness` — setup status
- All existing business logic stays intact

### Implementation order:
1. Restyle existing components (KPIs, health banner, materials, CO impact, attention list, action queue)
2. Create new components (BusinessSnapshot, MaterialsHealth, PackProgress, POSummary, OverviewTeamCard)
3. Update Dashboard.tsx layout
4. Update ProjectHome.tsx layout + add dark header
5. Verify responsive behavior

