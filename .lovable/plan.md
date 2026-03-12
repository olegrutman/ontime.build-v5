

# Dashboard Redesign — Clean Operations Layout

## Overview

Replace the current stacked-card dashboard with the clean, data-first 2-column layout from the HTML mockup. Keep all existing data hooks, dialogs, and onboarding logic intact — only the visual presentation changes.

## Layout Structure

```text
┌──────────────────────────────────────────────────┐
│  [Onboarding Checklist / Org Invite — if needed] │
├──────────────────────────────────────────────────┤
│  KPI ROW  (4 equal cards with animated counters) │
├──────────────────────────┬───────────────────────┤
│  Active Projects Table   │  Budget Card (340px)  │
│  (full table, not cards) │                       │
│                          ├───────────────────────┤
│  Recent Documents Table  │  Needs Attention      │
│                          │  (colored left border) │
│                          ├───────────────────────┤
│                          │  Live Feed             │
└──────────────────────────┴───────────────────────┘
```

On screens < 1060px: single column. On mobile: KPI row becomes 2x2 grid.

## New Components

### 1. `DashboardKPIRow.tsx` (NEW)
Four metric cards using real data from `useDashboardData`:
- **Contract Value** — `financials.totalRevenue` with neutral "Active" tag + amber progress bar at 100%
- **Invoices Paid** — `financials.totalBilled` with green trend tag + green progress bar (% of contract)
- **Pending Approvals** — `billing.outstandingToPay` or `outstandingToCollect` with yellow tag showing item count + yellow bar
- **Material Budget** — derived from PO data with "X% ordered" tag + navy bar

Each card: white bg, 1px border, 8px radius. Value in Barlow Condensed 900 2rem with count-up animation (900ms cubic ease-out). Thin 3px progress bar at bottom. Staggered fade-in entrance.

### 2. `DashboardProjectsTable.tsx` (NEW)
Replace `DashboardProjectList` card-row pattern with a proper HTML table matching the mockup:
- Table headers: tiny uppercase, faint color, bg-muted background
- Columns: Project (colored dot + name), Phase (project_type), Progress (64px bar + %), Value, Status (pill badge)
- Row hover: amber tint background
- Footer row: "Portfolio Total" + summed value in Barlow Condensed 900
- Header link: "All Projects →" navigates to project list
- Click row → navigate to project

### 3. `DashboardRecentDocs.tsx` (NEW)
Table of recent invoices, POs, work orders, change orders across all projects:
- Filter tabs: All / POs / Work Orders / Invoices / Change Orders (local state toggle)
- Columns: ID, Description, Type (colored badge), Status (colored badge), Amount
- Data: query recent items from existing hooks or a lightweight query
- Row hover: muted background

### 4. `DashboardBudgetCard.tsx` (NEW — right column)
Budget breakdown for the most active project:
- Summary block: Contract Total value in Barlow Condensed 900 + project name subtitle
- Four rows with colored dot + label + value + percentage: Paid (green), Materials Ordered (amber), Pending Approval (yellow), Remaining (border color)
- Each row has a 3px animated progress bar

### 5. `DashboardNeedsAttentionCard.tsx` (REDESIGN)
Replace current attention banner with the mockup's urgent-item style:
- Each item: white bg, 1px border, 6px radius, 2.5px colored left border
- Structure: emoji icon + title/subtitle + amount + status badge
- Hover: translateX(1px) + muted bg
- Data from existing `attentionItems` array

### 6. `DashboardLiveFeed.tsx` (NEW — right column)
Activity feed card with pulsing green "Live" dot in header:
- Each item: 26px avatar circle (initials) + body text with bold names + optional colored chip + timestamp
- Data: query recent `activity_log` or notifications — fallback to static placeholder if no activity table exists

## Modified Files

### `Dashboard.tsx` — Restructure JSX
- Keep: onboarding checklist, org invite banner, dialogs, all state/handlers
- Remove: `DashboardWelcome`, `DashboardFinancialSnapshot`, `DashboardAttentionBanner`, `RemindersTile`, `DashboardProjectList`
- Add: `DashboardKPIRow` + two-column grid with new components
- Grid: `grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-2.5`

### CSS/Tailwind Token Alignment
Add Barlow Condensed font import to `index.html`. Use existing Tailwind + custom classes for the clean aesthetic:
- Cards: `bg-white border border-[#E8EBF2] rounded-lg` (no shadow by default)
- KPI values: `font-['Barlow_Condensed'] text-[2rem] font-black tracking-tight`
- Table headers: `text-[0.64rem] uppercase tracking-widest text-[#9CA3AF] bg-[#F5F6F9]`

## Files Summary

| File | Action |
|------|--------|
| `src/components/dashboard/DashboardKPIRow.tsx` | NEW |
| `src/components/dashboard/DashboardProjectsTable.tsx` | NEW |
| `src/components/dashboard/DashboardRecentDocs.tsx` | NEW |
| `src/components/dashboard/DashboardBudgetCard.tsx` | NEW |
| `src/components/dashboard/DashboardNeedsAttentionCard.tsx` | NEW |
| `src/components/dashboard/DashboardLiveFeed.tsx` | NEW |
| `src/pages/Dashboard.tsx` | Restructure layout |
| `src/components/dashboard/index.ts` | Update exports |
| `index.html` | Add Barlow Condensed font import |

Existing components (`DashboardWelcome`, `DashboardFinancialSnapshot`, etc.) are kept in the codebase but no longer imported in Dashboard.tsx. All data still comes from `useDashboardData` — no new database queries except optionally for the live feed.

