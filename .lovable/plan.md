

# Major UI/UX Redesign — Dashboard + Project Overview

## Summary
Archive old dashboard/overview UI components, then build a redesigned Dashboard and Project Overview as a construction command center with materials-first design, financial clarity, and role-aware presentation — reusing all existing hooks, calculations, and business logic.

---

## Phase 1: Archive Old UI Files

### Create archive structure
```
src/archive/dashboard/
src/archive/project-overview/
```

### Files to archive (move + add header comment)

**Dashboard components → `src/archive/dashboard/`:**
- `DashboardKPIRow.tsx`
- `DashboardBudgetCard.tsx`
- `DashboardNeedsAttentionCard.tsx`
- `DashboardFinancialCard.tsx`
- `DashboardQuickStats.tsx`
- `DashboardWelcome.tsx`
- `DashboardActivityFeed.tsx`
- `DashboardRecentDocs.tsx`
- `DashboardTeamCard.tsx`
- `DashboardPartnersCard.tsx`
- `FinancialTrendCharts.tsx`
- `ProjectRow.tsx`
- `ProjectQuickOverview.tsx`

**Project overview → `src/archive/project-overview/`:**
- `ProjectOverviewV2.tsx`
- `ProjectBudgetRingChart.tsx`
- `ProjectActivityFeedSidebar.tsx`
- `OverviewContractsSection.tsx`
- `OverviewTeamCard.tsx`
- `OverviewProfitCard.tsx`
- `MetricStrip.tsx`
- `OperationalSummary.tsx`
- `ScopeSplitCard.tsx`
- `DownstreamContractsCard.tsx`

### Files to KEEP (not archive)
These have strong business logic or are used across non-overview tabs:
- All hooks (`useDashboardData`, `useProjectFinancials`, `useSupplierDashboardData`, `useSupplierMaterialsOverview`, etc.)
- `SupplierDashboard.tsx` + all `supplier/` sub-components (already well-designed)
- `AttentionBanner.tsx`, `PendingInviteCard.tsx`, `PendingInvitesPanel.tsx`
- `OnboardingChecklist.tsx`, `OrgInviteBanner.tsx`
- `AddReminderDialog.tsx`, `ArchiveProjectDialog.tsx`, `CompleteProjectDialog.tsx`
- `RemindersTile.tsx`, `StatusMenu.tsx`
- `MaterialsBudgetStatusCard.tsx`, `MaterialsBudgetDrawer.tsx`, `MaterialMarkupEditor.tsx`
- `BillingCashCard.tsx`, `UrgentTasksCard.tsx`, `BudgetTracking.tsx`
- `ProjectIconRail.tsx`, `ProjectBottomNav.tsx`, `CriticalScheduleCard.tsx`
- All PO, invoice, CO, returns, schedule, daily-log tab components
- App shell components (`AppShell`, `ProjectShell`, `ContextBar`, `BottomSheet`, etc.)

### Update imports
- Update `src/components/dashboard/index.ts` — remove archived exports
- Update `src/components/project/index.ts` — remove archived exports
- Update `Dashboard.tsx` and `ProjectHome.tsx` to import new components (Phase 2)

---

## Phase 2: New Dashboard

### Reuse
- **`useDashboardData`** hook — all data fetching, financials, attention items, reminders, project lists
- **`useSupplierDashboardData`** hook — supplier dashboard stays as-is (already good)
- **`SupplierDashboard.tsx`** — keep as-is for supplier role
- **`OnboardingChecklist`**, **`OrgInviteBanner`**, **`PendingInvitesPanel`** — keep
- **`AddReminderDialog`**, **`ArchiveProjectDialog`**, **`CompleteProjectDialog`** — keep
- **`RemindersTile`** — keep, place in right column
- **`StatusMenu`** — keep for project list filtering

### New components to build

| Component | Purpose |
|-----------|---------|
| `PortfolioHealthHero.tsx` | Top banner: active projects count, healthy/watch/risk badges, overall financial pulse |
| `DashboardKPIs.tsx` | Role-aware KPI cards (Contract In, Cost Out, Margin, Materials Forecast) |
| `DashboardMaterialsHealth.tsx` | Materials summary: estimate vs ordered vs delivered, variance, packs not started, unconfirmed deliveries. Uses data from `useDashboardData` aggregated across projects |
| `DashboardAttentionList.tsx` | Consolidated urgent items: risk projects, unapproved invoices, pending COs, unconfirmed deliveries, returns |
| `ProjectSnapshotList.tsx` | Scannable project cards with health badge, margin, materials variance, open PO count |
| `DashboardActionQueue.tsx` | Focused next-action cards: approve invoice, confirm delivery, review CO, etc. |

### Dashboard.tsx composition (GC/TC/FC)
```
<AppLayout>
  <OnboardingChecklist />
  <OrgInviteBanner />
  <PendingInvitesPanel />
  <PortfolioHealthHero />
  <DashboardKPIs />                    {/* role-aware */}
  <DashboardMaterialsHealth />         {/* if material-responsible */}
  <DashboardAttentionList />
  <div grid 1fr|340px>
    <ProjectSnapshotList />            {/* left */}
    <div>                              {/* right */}
      <DashboardActionQueue />
      <RemindersTile />
    </div>
  </div>
</AppLayout>
```

### Design tokens
- Rounded cards (`rounded-xl`), soft shadows (`shadow-sm`)
- KPI cards: large number (Barlow Condensed 2rem+), plain-language label, subtle accent bar
- Health badges: green "Healthy" / amber "Watch" / red "At Risk"
- Mobile: single column stack, cards not tables, sticky header

---

## Phase 3: New Project Overview

### Reuse
- **`useProjectFinancials`** — all financial calculations, role detection, material responsibility
- **`useProjectReadiness`** — setup/readiness logic
- **`useProjectEstimateRows`** — estimate data
- **`useSupplierMaterialsOverview`** — supplier materials (supplier view stays as-is)
- **`AttentionBanner.tsx`** — keep at top
- **`ProjectReadinessCard`** — keep for setup status
- **`MaterialsBudgetStatusCard`** / **`MaterialsBudgetDrawer`** — reuse for materials detail
- **`BillingCashCard`** / **`UrgentTasksCard`** — reuse or adapt
- **`ProjectShell`** / **`ProjectIconRail`** / **`ProjectBottomNav`** — keep navigation

### New components to build

| Component | Purpose |
|-----------|---------|
| `ProjectHealthBanner.tsx` | Healthy/Watch/Risk with specific reasons (materials over budget, CO negative margin, delivery not confirmed) |
| `ProjectFinancialCommand.tsx` | Role-aware KPI row: Original Contract, CO Adds, Revised Contract, Est. Cost, Projected Margin |
| `MaterialsCommandCenter.tsx` | The centerpiece for material users: estimate/ordered/delivered/returns/forecast/variance + packs not started + unmatched + next deliveries |
| `COImpactCard.tsx` | Approved CO revenue, CO cost, CO margin, pending exposure |
| `PackProgressSection.tsx` | Pack status cards with progress, ETA, risk indication |
| `ProjectPOSummary.tsx` | Card-based PO summary (not tables on mobile): PO#, package, amount, status, delivery signal |
| `ProjectActionQueue.tsx` | Project-specific next actions |

### ProjectHome.tsx overview tab composition
```
<AttentionBanner />
<ProjectReadinessCard />           {/* setup only */}
<ProjectHealthBanner />
<ProjectFinancialCommand />        {/* role-aware KPIs */}
<MaterialsCommandCenter />         {/* if material-responsible */}
<COImpactCard />
<div grid 1fr|340px on desktop>
  <div>
    <PackProgressSection />
    <ProjectPOSummary />
  </div>
  <div>
    <ProjectActionQueue />
    <BillingCashCard />             {/* reused */}
  </div>
</div>
```

### Tab bar
Keep existing `ProjectIconRail` (desktop) and `ProjectBottomNav` (mobile). No changes needed — they already handle all tabs.

---

## Phase 4: Visual Style

- **Cards**: `rounded-xl bg-card border border-border/60 shadow-sm`
- **KPI numbers**: `font-heading text-2xl font-bold` (Barlow Condensed)
- **Currency**: IBM Plex Mono
- **Section headers**: `text-xs uppercase tracking-wide text-muted-foreground font-medium`
- **Health badges**: pill-shaped, green/amber/red with icon
- **Mobile**: single-column, `pb-24` for bottom nav clearance, no tables — card lists only
- **Accent**: restrained orange for Ontime brand, status colors for health/risk only
- **Spacing**: `gap-3` between sections, `p-4` card padding

---

## Implementation Order

1. Create archive folders, move files, update imports (Step 1)
2. Build `PortfolioHealthHero` + `DashboardKPIs` + wire into `Dashboard.tsx`
3. Build `DashboardMaterialsHealth` + `DashboardAttentionList` + `ProjectSnapshotList` + `DashboardActionQueue`
4. Build `ProjectHealthBanner` + `ProjectFinancialCommand` + wire into `ProjectHome.tsx`
5. Build `MaterialsCommandCenter` + `COImpactCard` + `PackProgressSection` + `ProjectPOSummary` + `ProjectActionQueue`
6. Polish responsive behavior, test all roles

### What stays untouched
- All hooks and business logic
- All tab components (invoices, POs, COs, returns, schedule, daily log, SOV)
- Supplier dashboard (already well-structured)
- App shell, navigation, routing
- All dialogs and modals
- All RLS policies and permissions

