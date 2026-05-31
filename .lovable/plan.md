# Margin-to-Date: Accuracy Fixes (Phase 1 + Phase 2)

Two ordered phases. Phase 1 is a small surgical correction. Phase 2 adds a new lightweight ledger.

---

## Phase 1 — Eliminate double-count risk in realized margin

### What's wrong today (`src/hooks/useProjectFinancials.ts`, lines ~489–506)

**TC formula:**
```
incurredCostToDate = payablesInvoiced + materialOrdered + actualLaborCost + approvedCOCost
```
- `payablesInvoiced` already includes **PO-linked supplier invoices** (line ~367 filters `inv.po_id && poOwnerMap.has(...)`).
- `materialOrdered` is the total of **ordered POs** (status `ORDERED`/`DELIVERED`).
- A PO that is both Ordered *and* has a paid/submitted supplier invoice gets counted **twice**.
- `actualLaborCost` is currently hard-set to `0` (line 410), so it doesn't bite today — but the formula as written would double-count FC labor invoices the moment we wire it up.

**GC formula:**
```
incurredCostToDate = totalPaid + materialOrdered + approvedCOCost
```
- `totalPaid` is the sum of **all PAID invoices on the project** (line 331) — which already includes paid supplier POs and paid TC invoices.
- Adding `materialOrdered` again double-counts any PO that has progressed to a paid supplier invoice.

### Fix

Replace the cost side with a **single non-overlapping cash/accrual line**:

**TC (new):**
```
incurredCostToDate =
    payablesInvoiced                       // FC labor invoices + supplier PO invoices (already submitted/paid)
  + max(0, materialOrdered - materialInvoiced)  // remaining open PO commitment not yet invoiced
  + approvedCOCost
```
- Drop `actualLaborCost` from the sum entirely (labor flows through `payablesInvoiced` via FC invoices).
- `materialInvoiced` = sum of `subtotal` from submitted+paid invoices where `inv.po_id` belongs to one of this TC's POs. Compute alongside the existing payables block.

**GC (new):**
```
incurredCostToDate =
    totalPaid                              // everything actually paid out by GC
  + max(0, materialOrderedOpen)            // open POs the GC owns where no supplier invoice yet
  + max(0, tcInvoicedNotYetPaid)           // TC submitted invoices not yet PAID
  + approvedCOCost
```
- Optional: simplest variant is `incurredCostToDate = invoicedToGC + approvedCOCost` (purely accrual, no PO add-on). This is the cleanest and what most GC accounting expects.

**FC:** unchanged (no overlap risk).

### UI/Drilldown updates
Drilldown table on the Margin-to-Date KpiCard in `TCProjectOverview.tsx` and `GCProjectOverviewContent.tsx` must show the new component lines (Payables Invoiced, Open PO Commitment, COs) so the user sees the math.

### Files to edit
- `src/hooks/useProjectFinancials.ts` — add `materialInvoiced` aggregation in the TC payables block; rewrite the `marginToDate` block (~lines 489–506); expose the new components in the returned object.
- `src/components/project/TCProjectOverview.tsx` — update drilldown rows for the Margin-to-Date card.
- `src/components/project/GCProjectOverviewContent.tsx` — same, both standard and T&M branches.

### Dashboard (cash-basis rollup in `useDashboardData.ts`)
The cash rollup (`paidToYou − paidByYou`) does **not** have a double-count problem because it sums distinct paid invoices. No change to dashboard math in Phase 1 — but add a tooltip clarifying "cash basis" to set expectations.

---

## Phase 2 — Add owner-billing tracking so GC dashboard margin works

### Problem
On the dashboard, GC `earnedToDate` is forced to `0` because the platform never captures what the GC has billed the owner. Result: GC margin-to-date tile is structurally meaningless.

### Approach
Add a minimal **owner billings** ledger and surface a small UI to record them. Keep it independent of invoicing/SOV so we don't entangle Phase 2 with existing flows.

### Database (migration)
New table `public.gc_owner_billings`:
- `id uuid pk`
- `project_id uuid not null` (FK to `projects`)
- `gc_org_id uuid not null` (FK to `organizations`)
- `billing_number text` (optional, user-supplied)
- `billed_amount numeric not null`           — invoiced to owner
- `collected_amount numeric not null default 0` — actually received
- `billed_at date not null`
- `collected_at date null`
- `notes text`
- `created_by_user_id uuid`
- `created_at`, `updated_at`

GRANTs to `authenticated` + `service_role` (no anon). RLS:
- SELECT/INSERT/UPDATE/DELETE only if `is_project_participant(project_id, auth.uid())` AND user belongs to `gc_org_id` AND user's org type is `General Contractor`.
- TCs/FCs/Suppliers cannot see this table (preserves the "GCs cannot disclose owner-side numbers" privacy rule).

### Hook changes
- `useProjectFinancials.ts` (GC branch): use `sum(billed_amount)` for `earnedRevenueToDate` instead of `billedToDate` (which is actually TC→GC billings). Keep CO revenue line.
- `useDashboardData.ts` (GC branch): `earnedToDate = sum(collected_amount) across projects` (cash basis to match the rest of dashboard), instead of forcing `0`.

### UI
- New small "Owner Billings" panel on the GC Project Overview (collapsible card), with add/edit/mark-collected actions.
- No changes to TC/FC views — table is GC-only.

### Files to add/edit
- New migration: `gc_owner_billings` table + GRANTs + RLS.
- `src/hooks/useProjectFinancials.ts` — fetch + aggregate owner billings for GC.
- `src/hooks/useDashboardData.ts` — fetch + aggregate per-project owner billing collected totals for GC.
- New component: `src/components/project/gc/OwnerBillingsPanel.tsx`.
- Mount in `GCProjectOverviewContent.tsx` near the contract/financials section.

### Out of scope (Phase 2)
- No PDF export of owner billings.
- No notifications/triggers.
- No mirroring to SOV.

---

## Order of operations

1. Implement **Phase 1** end-to-end (hook + 2 overview components), verify drilldown math on the current project (`/project/f21a4a24…/overview`).
2. After approval, run **Phase 2** migration, then wire the hook/UI changes and the new `OwnerBillingsPanel`.

## Approval needed
Confirm Phase 1 math choice for GC: **(A)** pure accrual `invoicedToGC + COs`, or **(B)** mixed `totalPaid + openPOs + unpaidTCInvoices + COs`. Default recommendation: **A** (simpler, matches standard GC books).
