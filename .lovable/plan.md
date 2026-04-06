

# Replace GC Dashboard with Expandable KPI Card Design

## What I Understand

You want the main `/dashboard` page — what GC users see when they log in — to use the rich expandable KPI card design (navy/amber palette, Barlow Condensed values, IBM Plex Mono currency, inner tables, status pills, warning items) instead of the current simpler card layout. The current dashboard pulls real data from Supabase; the new design should keep that real data but present it in the expandable KPI card format.

## What I'm Going to Do

Rebuild the GC view of `/dashboard` to match the KPI card design system. When `orgType === 'GC'`, the dashboard renders the 8-card expandable grid, portfolio metrics table, warnings section, and project cards — all wired to **real data** from the existing `useDashboardData` hook.

The existing non-GC paths (TC, FC, Supplier) stay unchanged.

## Plan

### Step 1: Create `GCDashboardView` component

New file: `src/components/dashboard/GCDashboardView.tsx`

This component receives the same props the current dashboard uses (`projects`, `financials`, `billing`, `attentionItems`, `recentDocs`, `reminders`, `statusCounts`, `profile`) and renders:

- **8 expandable KPI cards** using the exact `KpiCard` pattern from `PlatformGCDashboard.tsx` (accent bars, pills, inner tables, expand/collapse transitions)
- **Portfolio Metrics table** (full-width, all projects)
- **Needs Attention warnings** (derived from `attentionItems`)
- **All Projects grid** (project cards with progress bars and status pills)

Sub-components (`KpiCard`, `Pill`, `Bar`, `THead`, `TableRow`, `WarnItem`, `ProjectCard`) are copied from `PlatformGCDashboard.tsx` but wired to real data instead of hardcoded arrays.

### Step 2: Map real data to KPI cards

| Card | Data Source |
|------|------------|
| Total Owner Budget | `financials.totalBudget` + `projects[].contract_value` |
| GC Profit Margin | Owner budget minus TC contract totals |
| Change Orders | `recentDocs` filtered by type `change_order` |
| Materials Budget | `financials.paidByYou`, `financials.totalCosts` |
| Open RFIs | `attentionItems` + project RFI counts |
| Paid Invoices | `financials.paidByYou` |
| Pending Approval | `billing.pendingInvoices` from `attentionItems` |
| TC Contracts | Contract data from projects |

Cards that lack real data (e.g. no RFIs tracked yet) show "—" gracefully.

### Step 3: Update `Dashboard.tsx`

After the supplier check (`orgType === 'SUPPLIER'`), add a GC check:

```tsx
if (orgType === 'GC') {
  return (
    <AppLayout ...>
      <GCDashboardView
        projects={projects}
        financials={financials}
        billing={billing}
        attentionItems={attentionItems}
        recentDocs={recentDocs}
        reminders={reminders}
        statusCounts={statusCounts}
        profile={profile}
        // pass through action handlers
      />
    </AppLayout>
  );
}
```

The existing layout (greeting, onboarding, KPI row, 8/4 grid) becomes the fallback for TC/FC users.

### Step 4: Preserve existing functionality

- Onboarding checklist, org invite banner, pending invites — rendered inside `GCDashboardView` at the top
- Reminder add/complete — passed as callbacks
- Project status update, archive, complete dialogs — still available
- "New Project" button — still in AppLayout header
- DashboardSidebar — still rendered

### Step 5: Style system

All the design tokens (Barlow Condensed, IBM Plex Mono, navy/amber palette, pill variants, 4px progress bars) carried over from `PlatformGCDashboard.tsx`. The responsive grid (4→3→2→1 columns) and card expand transitions (0.44s cubic-bezier) applied identically.

### Files changed

| File | Change |
|------|--------|
| `src/components/dashboard/GCDashboardView.tsx` | **New** — full GC dashboard with expandable KPI cards, wired to real data |
| `src/pages/Dashboard.tsx` | Add GC branch that renders `GCDashboardView` instead of the current layout |

### What is NOT changing
- TC/FC/Supplier dashboard views
- `useDashboardData` hook
- `DashboardKPIs`, `DashboardBusinessSnapshot` (still used by TC/FC)
- Platform admin GC Dashboard at `/platform/gc-dashboard` (stays as demo/reference)
- Database, RLS, routes

