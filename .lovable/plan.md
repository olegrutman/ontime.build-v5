

# Supplier Dashboard Redesign

## What This Is

Right now, every org type (GC, TC, FC, Supplier) sees the same dashboard layout: KPI row, project list, recent docs, budget card, attention card, and reminders. That layout was designed for contractors who manage budgets and work orders. It does not serve a supplier.

A supplier's day is different. They need to know: what actions are waiting on me, what am I delivering this week, am I going to get paid, how are my estimates performing, and which GC accounts are risky. The HTML mockup you uploaded lays this out clearly.

## What Changes

The `Dashboard.tsx` page will detect when `orgType === 'SUPPLIER'` and render a completely different layout — a new `SupplierDashboard` component. The existing GC/TC/FC dashboard stays untouched.

### Section 1 — KPI Strip (4 cards)
Four supplier-specific metrics replacing the current KPI row:
- **Total Receivable** — sum of all outstanding (non-DRAFT, non-PAID) supplier invoices. Tag shows overdue count.
- **Paid This Month** — sum of invoices marked PAID this calendar month. Tag shows month-over-month trend.
- **Open Orders** — count of POs in non-terminal statuses (SUBMITTED, PRICED, ORDERED). Tag shows how many need confirmation.
- **Credit Exposure** — total value of DELIVERED POs where the corresponding invoice has not yet been approved. This is the supplier's real risk number.

### Section 2 — Action Queue
Full-width card, top of page after KPIs. Replaces the current "Needs Attention" sidebar card. Every item has:
- Color-coded left border (red = urgent, amber = warning, blue = info)
- Icon, description, project context, dollar amount
- Direct action button ("Confirm", "Schedule", "Follow Up", "Respond")

Actions sourced from:
- POs in SUBMITTED status needing pricing confirmation
- POs with upcoming delivery but no confirmed delivery window
- Invoices past due date
- Returns in SUBMITTED or disputed status

### Section 3 — Two-column grid (Delivery Schedule + Receivables)

**Left: Delivery Schedule**
- 5-day calendar strip (Mon–Fri) showing which days have deliveries
- Below the strip: delivery rows showing project, PO number, items, time window, confirmation status
- Data from `purchase_orders` where status is ORDERED and delivery date falls in the 5-day window

**Right: Receivables Aging**
- Total outstanding at top
- Three aging buckets with progress bars: Current (0–30 days), Due Soon (31–45 days), Overdue (45+ days)
- Oldest invoice callout
- Approval velocity mini-chart: average days from invoice submission to approval, shown as a 5-bar trend (last 5 months)

### Section 4 — Two-column grid (Estimate Catalog + Project Health)

**Left: Active Estimates → Orders**
- Each row shows: project name, GC name, material categories (as small tags), estimate total, line item count
- Progress bar showing what percentage of the estimate has been converted to POs
- Data from `supplier_estimates` joined with `purchase_orders` to calculate ordered percentage

**Right: Project Health Signals**
- Per-project row showing: project name, GC name, budget status (On Budget / Variance Flagged / Over Budget), approval pace trend (Faster / Normal / Slowing), and the supplier's own credit exposure on that project
- Footer: "Delivered, Not Yet Approved" breakdown per project showing shipped vs. approved vs. at-risk amounts
- None of this exposes the GC's private financials — only the supplier's own delivery and payment data

### Section 5 — Two-column equal grid (Open POs Table + Returns Queue)

**Left: Open Purchase Orders**
- Compact table: PO #, Project, Description, Status badge, Value
- Links to PO detail page on click

**Right: Returns Queue**
- Active returns with status badges, credit amounts, and action buttons for items needing response
- Color-coded left borders matching urgency

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/Dashboard.tsx` | Add `orgType === 'SUPPLIER'` branch that renders `<SupplierDashboard />` instead of the current layout |
| `src/components/dashboard/SupplierDashboard.tsx` | **New** — main orchestrator component, fetches supplier-specific data and renders all 5 sections |
| `src/components/dashboard/supplier/SupplierKPIStrip.tsx` | **New** — 4 KPI cards with count-up animations (reuses existing `useCountUp` pattern) |
| `src/components/dashboard/supplier/SupplierActionQueue.tsx` | **New** — action items with color-coded borders and direct CTAs |
| `src/components/dashboard/supplier/SupplierDeliverySchedule.tsx` | **New** — 5-day strip + delivery rows |
| `src/components/dashboard/supplier/SupplierReceivables.tsx` | **New** — aging buckets + velocity chart |
| `src/components/dashboard/supplier/SupplierEstimateCatalog.tsx` | **New** — estimate rows with % ordered progress bars |
| `src/components/dashboard/supplier/SupplierProjectHealth.tsx` | **New** — per-project health signals + exposure footer |
| `src/components/dashboard/supplier/SupplierOpenOrders.tsx` | **New** — compact PO table |
| `src/components/dashboard/supplier/SupplierReturnsQueue.tsx` | **New** — active returns with action buttons |
| `src/hooks/useSupplierDashboardData.ts` | **New** — single hook that fetches all supplier-specific data in parallel (POs, invoices, estimates, returns, delivery windows) |

## Data Strategy

All data comes from existing tables — no database migrations needed:
- **POs**: `purchase_orders` where `organization_id` = supplier org
- **Invoices**: `invoices` where `from_org_id` = supplier org (supplier-sent invoices)
- **Estimates**: `supplier_estimates` + `supplier_estimate_items` where `supplier_org_id` = supplier org
- **Returns**: `returns` where `supplier_org_id` = supplier org
- **Exposure**: DELIVERED POs minus APPROVED/PAID invoices per project
- **Velocity**: Calculated from invoice `submitted_at` vs `approved_at` timestamps, grouped by month

## Design Tokens

Follows the exact same visual language from your mockup:
- Barlow Condensed for KPI values and card titles (uppercase, tracked)
- DM Sans for body text (already the app default)
- Color-coded status dots, progress bars, and left-border accents
- Cards with the existing `rounded-2xl shadow-sm` pattern from `card.tsx`
- Responsive: 2-column grids collapse to single column on mobile, KPIs go 2×2

