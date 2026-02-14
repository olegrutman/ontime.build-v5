
# Redesign Project Overview Page - Four-Zone Layout

## Overview
Replace the current two-column Overview layout (financial cards + sidebar context tiles) with a dense, role-aware four-zone vertical layout that answers three questions instantly: Am I profitable? Am I over budget on materials? What needs my attention?

## Current State
- **Zone A** (left column): AttentionBanner, MetricStrip (WO/Invoice/PO counts), and a large ProjectFinancialsSectionNew (913 lines, contract cards with inline editing, billing progress)
- **Zone B** (right 340px column): Team, Contracts, Scope -- all collapsible
- Layout is `grid-cols-1 lg:grid-cols-[1fr_340px]`
- Financial data is spread across MetricStrip, ProjectFinancialsSectionNew, and SupplierFinancialsSummaryCard
- AttentionBanner sits below the top bar, easy to miss on scroll

## New Layout Structure

```text
+----------------------------------------------------------+
| ZONE 4: ATTENTION CENTER (amber banner, always visible)  |
+----------------------------------------------------------+
| ZONE 1: FINANCIAL SIGNAL BAR                             |
| [Card][Card][Card][Card][Card] -- dense, compact, 12-col |
+----------------------------------------------------------+
| ZONE 2: FINANCIAL HEALTH SNAPSHOT                        |
| [Graph 1]                    [Graph 2]                   |
+----------------------------------------------------------+
| ZONE 3: OPERATIONAL SUMMARY                              |
| [Recent WOs] [Recent Invoices] [Team] [Scope Summary]    |
+----------------------------------------------------------+
```

On mobile: Attention Center first, then Financial Signal Bar stacked vertically, then graphs stacked, then operational lists.

## Detailed Zone Specifications

### Zone 4: Attention Center (moved to top)
- Reuse existing `AttentionBanner` component with minor styling tweaks
- Position as the first element in the overview (above financials)
- No content changes needed -- already role-aware

### Zone 1: Financial Signal Bar
Create a new `FinancialSignalBar` component that replaces both `MetricStrip` and `ProjectFinancialsSectionNew`.

**Data source**: Single hook `useProjectFinancials(projectId)` that fetches contracts, invoices, POs, work orders, and FC hours in parallel.

**Role-based cards** (compact: p-3, no 40px icon circles, just small inline icons):

| # | FC | TC | GC | Supplier |
|---|----|----|----|----|
| 1 | Contract with TC | Incoming Contract (GC) | Contract with TC | Order Value |
| 2 | Invoiced to Date | Outgoing Contract (FC) | Approved Work Orders | Invoiced |
| 3 | Retainage Held | Supplier Estimate (if mat. responsible) | Total Invoiced | Paid |
| 4 | Approved WOs Pending Billing | Total Billed to GC | Retainage Held | Outstanding |
| 5 | Remaining Balance | Live Position (In - Out - Materials) | Supplier Est vs Orders | -- |
| 6 | -- | Material Ordered vs Estimate | -- | -- |
| 7 | -- | Total Paid to FC | -- | -- |

**Layout**: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6` with `gap-2`. Each card is a small bordered div with:
- 11px uppercase label
- 20px bold number
- Optional color indicator (green/red/amber)
- No large icon boxes -- just a 14px inline icon next to the label

**TC "Live Position" card**: Shows `Incoming - Outgoing - Materials Ordered` with green/red coloring based on positive/negative.

### Zone 2: Financial Health Snapshot
Create a new `FinancialHealthCharts` component using recharts (already installed).

**GC and TC**: Material Estimate vs Actual Orders bar chart. Red bar overlay if actual exceeds estimate. Simple two-bar comparison per work order or aggregate.

**TC only (additional)**: Margin Position Trend -- line chart showing cumulative margin over time based on approved work orders.

**FC**: Earned vs Invoiced vs Retainage -- grouped bar or stacked bar chart.

**Supplier**: No charts (skip zone entirely).

Layout: `grid-cols-1 md:grid-cols-2 gap-4`. Charts inside compact cards with `p-3`, chart height ~160px. Clean, minimal axes.

### Zone 3: Operational Summary
Create a new `OperationalSummary` component with four compact lists in a 2x2 grid (`grid-cols-1 sm:grid-cols-2 gap-3`).

1. **Recent Work Orders** (5 most recent): Title, status badge, date. Clickable rows navigating to WO detail.
2. **Recent Invoices** (5 most recent): Invoice number, status badge, amount. Clickable.
3. **Team**: Compact inline list (role dot + org name), not collapsible. Show count summary.
4. **Scope Summary**: 2-3 line text summary (type, floors, units). Link to edit.

No financial numbers in this zone -- purely operational status.

### Contract Editing
The existing inline contract editing from `ProjectFinancialsSectionNew` will be preserved. The contract value cards in Zone 1 will include hover-to-edit pencil icons that open the same inline edit flow.

## Files to Create / Modify

### New Files
1. **`src/hooks/useProjectFinancials.ts`** -- Consolidated data hook replacing scattered fetches in MetricStrip and ProjectFinancialsSectionNew. Returns role-specific financial metrics, chart data, and recent records.

2. **`src/components/project/FinancialSignalBar.tsx`** -- Zone 1. Dense grid of role-aware financial cards. Includes inline contract editing capability migrated from ProjectFinancialsSectionNew.

3. **`src/components/project/FinancialHealthCharts.tsx`** -- Zone 2. Recharts-based graphs. Material Estimate vs Orders, Margin Trend, Earned vs Invoiced.

4. **`src/components/project/OperationalSummary.tsx`** -- Zone 3. Four compact list panels: Recent WOs, Recent Invoices, Team summary, Scope summary.

### Modified Files
5. **`src/pages/ProjectHome.tsx`** -- Replace the current overview `grid-cols-1 lg:grid-cols-[1fr_340px]` layout with the new four-zone vertical stack. Remove imports of MetricStrip, ProjectFinancialsSectionNew, SupplierFinancialsSummaryCard, ProjectTeamSection, ProjectContractsSection, ProjectScopeSection from the overview tab. Add imports for the three new zone components.

6. **`src/components/project/index.ts`** -- Add exports for the three new components; keep old exports for other tabs that may reference them.

### Retained (no changes)
- `AttentionBanner.tsx` -- reused as-is for Zone 4
- `ProjectTeamSection.tsx`, `ProjectContractsSection.tsx`, `ProjectScopeSection.tsx` -- kept in codebase for potential use elsewhere, but removed from the Overview tab
- All other tabs (SOV, Work Orders, Invoices, Purchase Orders) remain unchanged

## Responsive Behavior
- **Desktop (lg+)**: Full 5-6 column signal bar, side-by-side charts, 2-column operational grid
- **Tablet (md)**: 3-column signal bar, stacked charts, 2-column operational grid
- **Mobile (sm/xs)**: Single-column stacked cards throughout, reduced chart height (120px), compact operational lists

## Technical Notes
- The `useProjectFinancials` hook will batch all Supabase queries using `Promise.all` for performance
- Viewer role detection reuses the existing pattern from `ProjectFinancialsSectionNew` (check user org against project_team)
- Chart data for "Margin Position Trend" aggregates approved work orders by month
- Material Estimate vs Orders compares `material_total` from change_order_projects against `po_line_items` totals from linked POs
- Contract inline editing logic will be extracted into a shared sub-component used by FinancialSignalBar
