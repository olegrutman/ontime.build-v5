

# Redesign Project Quick Overview: Role-Aware "Action Required" Dashboard

## The Problem
Right now when you expand a project card on the dashboard, you see generic KPI tiles (Budget %, Schedule %, Open RFIs) and phase progress bars. This is the same view for every user type -- a GC owner sees the same thing as a field carpenter or a supplier. In the real world of construction, each role cares about very different things when they glance at a project.

## What Each Role Should See

### Trade Contractor (TC) -- "Am I getting paid? Are we on schedule?"
- **Unpaid Invoices**: Count + total dollar amount of invoices you've submitted that aren't paid yet (SUBMITTED or APPROVED but not PAID). A chip like "$21K awaiting payment" is more useful than a budget %.
- **Schedule Alerts**: Overdue tasks (end_date < today, progress < 100) shown as red chips like "2 tasks overdue". Due-soon tasks (within 7 days) as amber chips.
- **Work Orders In Progress**: Count of WOs in non-final states (submitted/priced but not approved/executed) -- these represent scope you're working on that hasn't been locked down.
- **POs Needing Attention**: POs in SUBMITTED status where you're the supplier -- means you need to provide pricing.
- **Outstanding Billing**: How much billable work remains (contract value minus what you've invoiced).

### General Contractor (GC) -- "What do I need to approve or pay?"
- **Invoices to Review**: Submitted invoices awaiting your approval, with total dollar amount.
- **Work Orders Pending Approval**: WOs from subs that need your sign-off.
- **POs Awaiting Pricing**: POs you've sent that suppliers haven't priced yet.
- **Schedule Health**: Same overdue/due-soon chips.
- **Budget Burn**: How much of the total contract has been invoiced (approved+paid) -- keep the budget % but make it secondary.

### Field Contractor (FC) / Subcontractor -- "What's my next task?"
- **Schedule Items Due Soon**: Their active tasks coming up.
- **Outstanding Invoices**: Invoices they've submitted that are unpaid.
- **Work Orders Assigned**: WOs relevant to them.

### Supplier -- "What POs need my pricing?"
- **POs Needing Pricing**: POs assigned to them in SUBMITTED status.
- **Recent PO Activity**: Recently approved/finalized POs.

## Layout Change
Replace the current 3 KPI tiles + phase bars with a single **"Action Items"** section that shows clickable chips (similar to the AttentionBanner style) followed by a compact financial summary row. Each chip navigates to the relevant tab on the project page.

```text
┌─────────────────────────────────────────────────────┐
│ [!] 2 invoices unpaid ($21K)   [>]                  │
│ [!] 1 WO needs approval        [>]                  │
│ [!] 2 schedule tasks overdue   [>]                  │
├─────────────────────────────────────────────────────┤
│  Billed: $35K   Outstanding: $21K   Schedule: 17%  │
├─────────────────────────────────────────────────────┤
│                         [View Full Project →]       │
└─────────────────────────────────────────────────────┘
```

If there are zero action items, show a green "All Clear" state with just the summary metrics.

## Technical Changes

| File | Change |
|------|--------|
| `src/hooks/useProjectQuickStats.ts` | Add new fields: `unpaidInvoices` (count + amount), `pendingWOs` (count), `pendingPOs` (count), `overdueTasks` (count), `dueSoonTasks` (count), `totalBilled`, `outstandingBilling`. Fetch invoices in all non-DRAFT statuses (not just approved/paid). Fetch WOs and POs with status filters. Accept `orgType` and `orgId` params to tailor queries (e.g., TC checks invoices where their org is `to_org`, GC checks where their org is `from_org`). |
| `src/components/dashboard/ProjectQuickOverview.tsx` | Replace KPI tiles + phase bars with role-aware action chips. Accept `orgType` prop. Show clickable chips for items needing attention (navigate to project tab). Show compact metrics row below. Green "All clear" state when no actions needed. |
| `src/components/dashboard/ProjectRow.tsx` | Pass `orgType` through to `ProjectQuickOverview`. |
| `src/components/dashboard/DashboardProjectList.tsx` | Already passes `orgType` to `ProjectRow` -- no change needed. |

The hook will make 6 parallel queries per expansion (contracts, invoices, schedule, RFIs, WOs, POs) instead of the current 4. All queries are already RLS-safe since they filter by `project_id`.

