

# Dashboard Redesign — Expandable Project Cards with Quick Overview

## Concept
Redesign `ProjectRow` so clicking a project expands it inline (accordion-style) to show a quick overview matching the screenshot reference: status badge, 3 KPI tiles (Budget Used, Schedule, Open RFIs), and phase progress bars. A "View Full Project" button navigates to the project detail page. Only one project expands at a time.

## Data Available
- **Budget**: `project_contracts.contract_sum` (already fetched) + `invoices` with `total_amount` for billed amounts
- **Schedule**: `project_schedule_items` table has `progress`, `title`, `start_date`, `end_date`, `color` per item
- **RFIs**: `project_rfis` table with `status` field (OPEN/ANSWERED/CLOSED)

## Architecture

### New hook: `useProjectQuickStats(projectId)`
Fetches on-demand (when a project is expanded) via 3 parallel queries:
1. **Budget**: contract sum from `project_contracts` + sum of approved/paid invoices → compute % used
2. **Schedule**: all `project_schedule_items` → compute overall weighted progress %, check if on schedule (compare progress vs. elapsed time)
3. **RFIs**: count from `project_rfis` where `status = 'OPEN'`, plus count where `due_date <= today` (need response today)

Returns: `{ budgetPercent, budgetUsed, budgetTotal, schedulePercent, scheduleDelta, openRFIs, urgentRFIs, phases, loading }`

### Modified: `ProjectRow.tsx` → expandable card
- Click on row toggles expansion (instead of navigating)
- Collapsed state: same as current (name, type, role, status badge, contract value)
- Add a top-right status badge like screenshot ("ON SCHEDULE ✓" / "AT RISK" / "BEHIND")
- Expanded state shows:
  1. **3 KPI tiles** in a row: Budget Used (% + dollar subtitle), Schedule (% + days ahead/behind), Open RFIs (count + urgent subtitle)
  2. **Phase Progress** section: horizontal bars per schedule item with title, color, progress %, "Done" label when 100%
  3. **"View Full Project →"** button at bottom right

### Modified: `DashboardProjectList.tsx`
- Track `expandedProjectId` state
- Pass to `ProjectRow` so only one expands at a time
- Keep the 3-dot menu for status changes (archive, hold, etc.)

### New component: `ProjectQuickOverview.tsx`
Renders the expanded content: KPI tiles + phase progress bars + CTA button. Receives data from the hook.

### Styling (per screenshot reference)
- KPI tiles: white card with uppercase muted label, large colored number (orange for budget, green for schedule, indigo for RFIs), small subtitle
- Phase bars: colored horizontal bars with rounded ends, label left, percentage right, "Done" badge for 100%
- Status badge: green pill with checkmark for on-schedule, amber for at-risk, red for behind
- Smooth expand/collapse animation via Collapsible

## Files

| File | Action |
|------|--------|
| `src/hooks/useProjectQuickStats.ts` | NEW — on-demand data fetcher |
| `src/components/dashboard/ProjectQuickOverview.tsx` | NEW — expanded view UI |
| `src/components/dashboard/ProjectRow.tsx` | MODIFY — add expand/collapse, status badge |
| `src/components/dashboard/DashboardProjectList.tsx` | MODIFY — track expanded state |
| `src/components/dashboard/index.ts` | UPDATE exports |

