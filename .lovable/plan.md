

# Redesign Project Overview to Match Demo-V2 (Light Theme)

## What Changes
Transform the project overview tab from its current flat card layout into the demo-v2 pattern: hero card with KPI tiles and progress bar, pill segment tabs (Budget/Orders/Field), SVG donut chart, colored budget breakdown with progress bars, and live activity feed — all on light surfaces using real data.

## Layout Structure

```text
┌─────────────────────────────────────┬──────────────────────┐
│  Hero Card (project color gradient) │  SVG Donut Chart     │
│  Phase • Name • Location • Status   │  (budget breakdown)  │
│  [Contract] [Paid] [Pending] tiles  │                      │
│  Progress bar (animated)            │  Activity Feed       │
│                                     │  (real Supabase data)│
│  [Budget] [Orders] [Field] pills    │                      │
│                                     │                      │
│  Tab content:                       │                      │
│  - Budget: colored progress lines   │                      │
│  - Orders: 3px left-border items    │                      │
│  - Field: checkbox task list        │                      │
└─────────────────────────────────────┴──────────────────────┘
```

Mobile: single column, right panel below.

## Implementation Steps

### 1. Create `ProjectOverviewV2.tsx`
New component that replaces the current overview content inside `ProjectHome.tsx` (lines 316-385). Contains:

- **Hero card**: Light surface (`bg-card`) with subtle `radial-gradient` using project accent color at 8% opacity. Barlow Condensed heading, phase tag, location, status badge. 3 KPI tiles (Contract, Paid, Pending) from `financials`. Animated progress bar.
- **Pill tabs**: `budget | orders | field` — same pattern as demo-v2 but on light surface (`bg-muted/50` inactive, `bg-primary text-primary-foreground` active).
- **Budget tab**: Remaining/Total summary card + SOV/budget line items with colored progress bars. Data from `financials` (billedToDate, totalPaid, upstream contract). Each line clickable → opens BottomSheet.
- **Orders tab**: Filter pills (All/PO/WO/INV/CO) + list of recent invoices, POs, COs from existing Supabase queries. 3px left-border per status color. Click → BottomSheet.
- **Field tab**: Daily log tasks or schedule items from existing hooks. Checkbox toggle pattern.

### 2. Create `ProjectBudgetRingChart.tsx`
Light-theme SVG donut chart (port of `demo-v2/BudgetRingChart.tsx`):
- Takes real data: Paid, Pending, Remaining from `financials`
- Colors: green (paid), amber (pending), navy (remaining)
- Animated stroke-dashoffset on mount
- Legend below with IBM Plex Mono values

### 3. Create `ProjectActivityFeedSidebar.tsx`
Right-column activity feed using real data from `project_activity` table (same query pattern as `ProjectActivitySection.tsx`):
- Avatar initials circle, name, description, chip label, relative timestamp
- Light theme: `bg-card` surface, `text-foreground`, subtle chip backgrounds
- Limited to 8 most recent items

### 4. Update `ProjectHome.tsx` overview section
Replace lines 316-385 (the current overview content block) with `<ProjectOverviewV2>` component, passing `financials`, `projectId`, project data, and navigation handler. Keep all existing setup banner, readiness card, and mobile attention banner logic above it.

### 5. Wire BottomSheet
Import existing `BottomSheet` from `src/components/app-shell/BottomSheet.tsx`. Open on budget line or order item click with meta tiles.

## Data Sources (all existing — no new queries needed)
- `financials` hook → contract values, paid, pending, billing data
- `project_activity` table → activity feed
- `invoices` + `purchase_orders` tables → orders tab
- Project object → name, status, location, phase

## Typography
- Hero heading: `Barlow Condensed`, `text-[28px] font-bold`
- KPI tile values: `IBM Plex Mono`
- Section headers: `text-[0.7rem] uppercase tracking-[0.4px]`
- Currency: `IBM Plex Mono`

## Files Created
- `src/components/project/ProjectOverviewV2.tsx` — main overview layout
- `src/components/project/ProjectBudgetRingChart.tsx` — SVG donut
- `src/components/project/ProjectActivityFeedSidebar.tsx` — right column feed

## Files Modified
- `src/pages/ProjectHome.tsx` — swap overview content to use `ProjectOverviewV2`

## Files NOT Changed
- All existing cards (`ContractHeroCard`, `BillingCashCard`, `ProfitCard`, etc.) — preserved but no longer rendered in default overview (moved into pill tab content or kept as optional)
- Navigation, auth, hooks, database — untouched

