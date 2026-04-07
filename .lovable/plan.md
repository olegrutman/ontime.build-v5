

# Build FC Project Overview Page

## Overview

Create a dedicated `FCProjectOverview` component that renders when a Field Crew user views a project overview. This replaces the generic `GCProjectOverviewContent` for FC users with a focused, read-only view of their contract, earnings, work progress, and pending items.

## Architecture

- New file: `src/components/project/FCProjectOverview.tsx`
- Modify: `src/pages/ProjectHome.tsx` — conditionally render `FCProjectOverview` when `isFC` is true

The component follows the exact same visual architecture as `GCProjectOverviewContent`: inline styles using the same design tokens (Barlow Condensed headings, IBM Plex Mono currency, DM Sans body), same `KpiCard`, `Pill`, `THead`, `TRow`, `WarnItem` helper components, same 3px accent bar + expand/collapse pattern.

## Data Sources

All data comes from the existing `financials: ProjectFinancials` prop (already passed in `ProjectHome.tsx`):
- **Contract**: `financials.downstreamContract` (FC's contract set by TC) — `contract_sum`, `labor_budget`
- **Paid/Pending**: `financials.totalPaid`, `financials.billedToDate`, `financials.outstanding`
- **Invoices**: `financials.recentInvoices` (filtered by status)
- **Change Orders**: Queried via `supabase.from('change_orders')` scoped to project + FC org
- **Work progress**: Derived from invoice milestones and CO data

## Component Structure — `FCProjectOverview.tsx`

### Page Header
- Left: color dot + project name + phase subtitle + crew name
- Right: amber "Submit Invoice to TC" button → `onNavigate('invoices')`, ghost "View My Tasks" button

### 6 KPI Cards (3-col grid, matching GC layout)

1. **My Contract** (amber accent) — `downstreamContract.contract_sum`, read-only. Expand: contract value, approved COs, revised total, internal cost budget, net margin. Info callout: "Your contract was set by [TC name]. Contact your TC to negotiate changes."

2. **Net Margin** (green accent) — contract minus `labor_budget`. Expand: same breakdown with margin percentage.

3. **Change Orders** (blue accent) — query `change_orders` for FC's project. Expand: table of COs with status pills. Ghost button: "Submit CO Request to TC" → `onNavigate('change-orders')`.

4. **Paid by TC** (green accent) — `totalPaid`. Expand: table of PAID invoices from `recentInvoices`.

5. **Pending from TC** (yellow accent) — SUBMITTED invoices sum. Expand: pending invoice detail with status message.

6. **Work Progress** (navy accent) — derived completion percentage. Expand: task/level breakdown table.

### Earnings Tracker (full-width card below grid)
5 horizontal bar rows (pure CSS, no chart library):
- Total Scope (contract + COs) — amber bar 100%
- Invoiced — green bar at invoiced %
- Received (Paid) — dark green bar
- Pending — yellow bar
- Remaining to Earn — faint border bar

### Warnings Section
Dynamic warnings built from financials state:
- Pending invoices awaiting TC approval
- Active work items nearing deadline
- Upcoming scope items

## Files Changed

| File | Change |
|------|--------|
| `src/components/project/FCProjectOverview.tsx` | **New** — Full FC project overview with 6 KPI cards, earnings tracker, warnings |
| `src/pages/ProjectHome.tsx` | Import `FCProjectOverview`, render it instead of `GCProjectOverviewContent` when `isFC === true` |

### What is NOT changing
- `GCProjectOverviewContent.tsx` — stays as-is for GC/TC roles
- `useProjectFinancials.ts` — already provides all needed FC data
- Database schema, RLS policies
- Design tokens, shared components

