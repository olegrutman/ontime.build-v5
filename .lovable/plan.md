

# Platform Dashboard Growth Metrics

## What to Build

Add growth analytics below the existing summary tiles on the Platform Dashboard. The platform owner will see real data showing how the business is growing over time.

## Sections to Add

### 1. Growth Trend Chart (new component)
A multi-line area chart (recharts, already installed) showing new signups over the last 6 months:
- **New Users** per month (from `profiles.created_at`)
- **New Organizations** per month (from `organizations.created_at`)
- **New Projects** per month (from `projects.created_at`)

### 2. This Period vs Last Period Cards
A row of comparison cards showing this month vs last month with delta indicators (green up / red down arrows):
- New Users this month vs last month
- New Orgs this month vs last month
- New Projects this month vs last month
- Invoices created this month vs last month
- Total invoice value this month vs last month

### 3. Activity Breakdown Cards
- **Organizations by Type**: Small bar/list showing count of GC, TC, FC, Supplier orgs
- **Projects by Status**: Breakdown of active, setup, on_hold, completed, archived
- **Invoices by Status**: Breakdown of DRAFT, SUBMITTED, APPROVED, PAID, REJECTED
- **Recent Activity Feed**: Last 10 support action logs with timestamp, action type, and actor (from `support_actions_log`)

## Data Fetching

Create a new hook `src/hooks/usePlatformMetrics.ts` that:
- Fetches `profiles`, `organizations`, `projects` with `created_at` for the last 6 months
- Groups by month client-side for the chart
- Computes this-month vs last-month deltas
- Fetches org type breakdown, project status breakdown, invoice status breakdown
- Fetches last 10 support logs with actor profile info

## Files to Create/Edit

- **Create**: `src/hooks/usePlatformMetrics.ts` — data fetching hook
- **Create**: `src/components/platform/PlatformGrowthChart.tsx` — area chart component
- **Create**: `src/components/platform/PlatformPeriodComparison.tsx` — comparison cards
- **Create**: `src/components/platform/PlatformBreakdowns.tsx` — org type, project status, invoice status breakdowns + recent activity
- **Edit**: `src/pages/platform/PlatformDashboard.tsx` — integrate all new sections below existing tiles

## No Database Changes
All data queried via existing tables with platform user SELECT access.

