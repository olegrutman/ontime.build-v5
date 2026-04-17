

# Supplier Dashboard — Full Test, Analysis & Bug Report

## Goal
Read-only audit of the Supplier dashboard end-to-end: every KPI formula, every hook, every data link, every role rule, and every navigation path. Report findings with concrete fixes — no code changes in this mode.

## Scope of audit

**Entry points & routing**
- `src/pages/Dashboard.tsx` → which dashboard renders for `SUPPLIER` org type
- `src/components/dashboard/SupplierDashboard.tsx` (top-level shell)
- Permission gates (`useAuth`, `permissions`, org-type routing)

**Data hooks**
- `src/hooks/useSupplierDashboardData.ts` — every KPI, bucket, trend, action item
- `src/hooks/useProjectEstimateRows.ts` — estimate→PO conversion math
- Any related hooks: `useFinancialTrends`, `useDashboardData` if cross-referenced

**Section components (each gets a formula + render audit)**
1. `SupplierKPIStrip` — Total Receivable, Paid This Month (+ MoM%), Open Orders, Credit Exposure
2. `SupplierActionQueue` — action item generation rules
3. `SupplierProjectList` — accepted projects
4. `SupplierDeliverySchedule` — delivery days/rows
5. `SupplierReceivables` — aging buckets (0-30, 31-60, 60+), velocity trend, oldest invoice
6. `SupplierEstimateCatalog` — estimates with ordered % calculation
7. `SupplierProjectHealth` — per-project health rows
8. `SupplierOpenOrders` — open POs
9. `SupplierReturnsQueue` — returns

**What I'll verify per metric**
- Source query (table, filters, status enum values used)
- Date math (timezone, month boundaries, "last 30 days")
- Currency math (null handling, division-by-zero, % rounding)
- Status enum correctness (e.g., `ACTIVE`, `ORDERED`, `DELIVERED`, `APPROVED`, `SUBMITTED`, `PAID`)
- Role-based filtering (supplier_org_id scoping, RLS expectations)
- Edge cases: empty data, single data point, very large values, negative MoM
- Navigation links from each card (do they route to the right page?)
- Realtime/refresh behavior

**Cross-checks**
- Compare hook outputs vs schema (`supplier_estimates`, `supplier_estimate_items`, `purchase_orders`, `invoices`, `po_line_items`, `returns`)
- Compare metric definitions to project memory rules:
  - `mem://features/supplier/materials-health-dashboard` (Estimated → Ordered → Billed lifecycle)
  - `mem://features/dashboard/profit-margin-and-cash-flow` (paid by you vs paid to you)
  - `mem://features/purchase-orders/lifecycle-and-status-logic` (6-state PO lifecycle)
  - `mem://features/invoicing/billing-and-reporting-logic` (Construction Gross formula)
  - `mem://security/material-pricing-privacy` (pricing visibility)

## Method

1. Read the supplier dashboard entry routing in `Dashboard.tsx`
2. Deep-read `useSupplierDashboardData.ts` — line by line, formula by formula
3. Deep-read each of the 9 section components for render bugs and prop mismatches
4. Read `useProjectEstimateRows.ts` (already partially shown — verify ordered logic)
5. Run a few read-only DB checks via `supabase--read_query` to validate enum values actually exist (e.g., do invoices use `PAID` or `paid`? are there POs with NULL `po_total`?)
6. Check supplier-specific memory files for documented rules and confirm code matches
7. Cross-reference Supplier role permissions in `useAuth` / permission system
8. Compile findings into a structured bug report

## Deliverable (after I run the audit in default mode)

A single structured report with:

1. **Critical bugs** — wrong math, broken links, missing role gates, RLS leaks
2. **Logic issues** — incorrect formulas, wrong status filters, edge cases unhandled
3. **UI/UX issues** — broken navigation, missing empty states, mobile breakage
4. **Performance** — N+1 queries, missing indexes signals, unnecessary refetches
5. **Inconsistencies** — code vs memory rules vs schema
6. **Recommended fixes** — exact file + line + suggested change for each finding

After the report, you can approve fixes one-by-one or in batches.

## What this plan does NOT do
- No code changes (read-only mode)
- No schema changes
- No permission changes
- No UI redesign — purely correctness audit

