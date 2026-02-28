

# Financial Command Center — Project Overview Upgrade

## Overview
Add four new financial intelligence sections to the Project Overview page for GC and TC roles. No redesign — only new tiles matching the existing card/signal-bar style.

## Current Layout (kept as-is)
1. ProjectReadinessCard (setup/draft only)
2. AttentionBanner
3. MaterialResponsibilityCard
4. FinancialSignalBar (small metric cards)
5. FinancialHealthCharts (bar/line charts)
6. OperationalSummary (WO, invoices, RFIs, team, scope)

## New Layout Order
1. ProjectReadinessCard (unchanged)
2. AttentionBanner (unchanged)
3. MaterialResponsibilityCard (unchanged)
4. **NEW: ContractSummaryTile** (Section 1)
5. **NEW: BillingCashTile** (Section 2)
6. **NEW: MaterialBudgetTile** (Section 3 — replaces material cards in FinancialSignalBar)
7. **NEW: LaborBudgetTile** (Section 4)
8. FinancialSignalBar (keep, remove redundant material cards since Section 3 covers them)
9. FinancialHealthCharts (keep)
10. OperationalSummary (keep)

---

## Section 1 — Contract Summary Tile

**New component:** `src/components/project/ContractSummaryTile.tsx`

A card displaying three labeled rows:
- **Original Contract** — `upstreamContract.contract_sum` (the primary TC-GC contract, excluding Work Order trade contracts)
- **+ Approved Work Orders** — sum of `final_price` from `change_order_projects` where `status` is `approved` or `contracted`
- **= Current Contract Total** — computed sum of the two above

Data source: Already available in `useProjectFinancials` — `upstreamContract.contract_sum` and `workOrderTotal`. No new queries needed.

Visible to: GC and TC.

---

## Section 2 — Billing and Cash Position Tile

**New component:** `src/components/project/BillingCashTile.tsx`

A card with four metric rows:
- **Total Invoiced** — sum of invoices with status SUBMITTED, APPROVED, or PAID (`billedToDate` from financials)
- **Total Paid** — sum of invoices with status PAID (new field needed in `useProjectFinancials`)
- **Retainage Held** — `retainageAmount` from financials
- **Outstanding Balance** — Total Invoiced - Total Paid - Retainage Held

Data source: Mostly available. Need to add `totalPaid` (GC/TC view) to `useProjectFinancials` — currently only `totalPaidToFC` exists for TC. Will compute from existing invoice data already fetched.

Visible to: GC, TC, and FC.

---

## Section 3 — Material Budget Control Tile

**New component:** `src/components/project/MaterialBudgetTile.tsx`

Only visible to the party responsible for materials (GC if material_responsibility='GC', TC if 'TC').

Displays:
- **Material Estimate Total** — from `materialEstimate` (approved estimate sum or manual override)
- **Delivered PO Total** — sum of POs in DELIVERED or FINALIZED status only (new query — currently `materialOrdered` includes ORDERED and READY_FOR_DELIVERY too)
- **Remaining Budget** — Estimate - Delivered
- **Over/Under Indicator** — color-coded with dollar and percentage difference
- **Ordered but Not Delivered** — POs in ORDERED/READY_FOR_DELIVERY status (informational)
- **Projected Impact Line** — "At current pace, projected material overage: +$X (+Y%)" based on ratio of delivered to total ordered

Data source: Need to split `materialOrdered` into `deliveredTotal` and `orderedNotDelivered` in `useProjectFinancials`. Will add two new fields.

The existing material cards in FinancialSignalBar become redundant and will be hidden when this tile is visible.

---

## Section 4 — Labor Budget Tracking Tile

**New component:** `src/components/project/LaborBudgetTile.tsx`

### Database Change
Add a `labor_budget` column to `project_contracts`:
```sql
ALTER TABLE project_contracts
  ADD COLUMN IF NOT EXISTS labor_budget numeric;
```

This stores the manually entered labor budget at the project level (on the primary TC-GC contract).

### Display
- **Budgeted Labor** — `labor_budget` from the primary contract (editable inline, same pattern as material budget edit)
- **Actual Labor Cost** — sum of `final_price` from approved/contracted work orders (already `workOrderTotal`) OR sum of `labor_total` from work orders (will use `labor_total` for accuracy)
- **Labor Variance** — Budget - Actual
- **Percentage Used** — (Actual / Budget x 100)
- Over/Under indicator with color coding

Data source: Need to add `actualLaborCost` (sum of `labor_total` from change_order_projects) and `laborBudget` to `useProjectFinancials`. Will also need `updateLaborBudget` action.

Visible to: GC and TC (editable by both). FC can see their own labor costs through existing FC view.

---

## Hook Changes — useProjectFinancials.ts

Add the following new fields to `ProjectFinancials` interface:

- `totalPaid: number` — sum of PAID invoice amounts
- `materialDelivered: number` — POs in DELIVERED/FINALIZED only
- `materialOrderedPending: number` — POs in ORDERED/READY_FOR_DELIVERY only
- `actualLaborCost: number` — sum of labor_total from approved/contracted work orders
- `laborBudget: number | null` — from primary contract's labor_budget column
- `updateLaborBudget: (contractId: string, amount: number) => Promise<boolean>` — save action

Split the existing `materialOrdered` calculation into delivered vs pending categories. Compute `totalPaid` from existing invoice data (already fetched, just not filtered).

---

## ProjectHome.tsx Changes

In the overview tab, insert the four new tiles between MaterialResponsibilityCard and FinancialSignalBar:

```
<MaterialResponsibilityCard ... />
<ContractSummaryTile financials={financials} />
<BillingCashTile financials={financials} />
<MaterialBudgetTile financials={financials} projectId={id} />
<LaborBudgetTile financials={financials} projectId={id} />
<FinancialSignalBar ... />
```

---

## Role Visibility Summary

| Section | GC | TC | FC | Supplier |
|---------|----|----|----|----|
| Contract Summary | Yes | Yes | No | No |
| Billing & Cash | Yes | Yes | Yes | No |
| Material Budget | If responsible | If responsible | No | No |
| Labor Budget | Yes | Yes | No | No |

---

## Files Modified
1. **New migration** — add `labor_budget` column to `project_contracts`
2. **`src/hooks/useProjectFinancials.ts`** — add totalPaid, materialDelivered, materialOrderedPending, actualLaborCost, laborBudget, updateLaborBudget
3. **New: `src/components/project/ContractSummaryTile.tsx`** — contract + WO summary
4. **New: `src/components/project/BillingCashTile.tsx`** — invoiced/paid/retainage/outstanding
5. **New: `src/components/project/MaterialBudgetTile.tsx`** — estimate vs delivered with projections
6. **New: `src/components/project/LaborBudgetTile.tsx`** — budget vs actual labor
7. **`src/components/project/index.ts`** — export new components
8. **`src/pages/ProjectHome.tsx`** — add new tiles to overview tab

## Design Approach
All new tiles use the same `border bg-card p-3` pattern used by OperationalSummary and existing tiles. Metric rows use the same `text-[11px] uppercase tracking-wide text-muted-foreground font-medium` label style. Values use `text-lg font-bold tabular-nums`. Color coding matches existing green/red/amber pattern from FinancialSignalBar.

