
# Project Overview Redesign — Financial Command Center v2

## Issues Found

### 1. Work Order Material Total Bug
Work order `c6afe17f` ("Rfi 87") has a linked PO (`0a8076a0`) but `material_total: 0`. The `workOrderTotal` calculation in `useProjectFinancials` only sums `final_price` from `change_order_projects` — it does not include linked PO line item totals. The `actualLaborCost` only sums `labor_total`, missing the material component entirely from the "Approved Work Orders" line.

**Fix**: When calculating work order totals for Contract Summary, sum `final_price` (which already includes materials for fixed-price WOs). For WOs with linked POs, ensure the `final_price` already reflects materials (it does — `final_price: 6170` includes labor `5500` + material markup `670`). The data is actually correct; `material_total: 0` is misleading but `final_price` is the authoritative total.

### 2. GC Material + Labor Budget When GC Is Responsible
Currently, `MaterialBudgetTile` and `LaborBudgetTile` only show for the material-responsible party or GC/TC respectively. When GC is responsible for materials, the GC should be able to set both material and labor budgets. This is already working — but the MaterialBudgetTile checks `isGCMaterialResponsible` which requires `material_responsibility = 'GC'` on the contract. On this project it is set to `'TC'`, so GC correctly doesn't see the material budget tile.

### 3. Redundant Information Problem
The current page stacks 8+ sections with heavily overlapping data:
- `ContractSummaryTile` shows Original Contract + Work Orders
- `BillingCashTile` shows Invoiced/Paid/Retainage/Outstanding
- `MaterialBudgetTile` shows Estimate vs Delivered
- `LaborBudgetTile` shows Budget vs Actual
- `FinancialSignalBar` shows Contract, Work Orders, Invoiced, Retainage, Material Budget, Material Ordered, Live Position, Paid to FC (7-8 cards!)
- `FinancialHealthCharts` shows Material Budget vs Orders chart, Margin Trend
- `OperationalSummary` shows WOs, Invoices, RFIs, Team, Scope

**Problem**: Contract value appears 3 times. Material budget appears 3 times. Invoice totals appear 3 times.

## Redesigned Overview Layout

Consolidate into 3 collapsible sections, role-aware, eliminating all redundancy:

### Section A: Financial Snapshot (always open by default)
A single, clean summary card with the key numbers a PM needs at a glance:

```text
+--------------------------------------------------+
| FINANCIAL SNAPSHOT                                |
|                                                   |
| Contract Value         $125,000                   |
| + Approved Work Orders  $11,745   (4 WOs)        |
| = Current Total        $136,745                   |
|                                                   |
| Billed to Date          $9,375                    |
| Paid                       $0                     |
| Retainage Held             $0                     |
| Outstanding           $127,370                    |
|                                                   |
| [If TC view: Live Position  $X,XXX  green/red]    |
+--------------------------------------------------+
```

This replaces: ContractSummaryTile + BillingCashTile + half of FinancialSignalBar.

### Section B: Budget Tracking (collapsible, open by default)
Side-by-side Material and Labor budget cards — only shown to the responsible party.

```text
+-------------------------+-------------------------+
| MATERIAL BUDGET         | LABOR BUDGET            |
| Budget:    $433,091     | Budget:    Not set [edit]|
| Delivered:      $0      | Actual:    $11,075      |
| Ordered:        $0      | Variance:  --           |
| Remaining: $433,091     | % Used:    --           |
| Status: Under Budget    |                         |
+-------------------------+-------------------------+
```

If GC is material-responsible: GC sees material budget + can set it.
If TC is material-responsible: TC sees material budget.
Both GC and TC can set labor budget.

This replaces: MaterialBudgetTile + LaborBudgetTile + material cards in FinancialSignalBar + FinancialHealthCharts material chart.

### Section C: Activity & Operations (collapsible, collapsed by default)
Keep existing OperationalSummary (WOs, Invoices, RFIs, Team, Scope) unchanged but make it collapsible.

### What Gets Removed
- **FinancialSignalBar** — fully replaced by Section A + B. All data is covered.
- **FinancialHealthCharts** — material chart is redundant with Section B. Margin trend moves into Section A as a small inline sparkline or stays as a collapsible sub-section for TC only.
- **ContractSummaryTile** — merged into Section A.
- **BillingCashTile** — merged into Section A.
- **MaterialBudgetTile** — merged into Section B.
- **LaborBudgetTile** — merged into Section B.

### What Stays
- `ProjectReadinessCard` (setup/draft only) — unchanged
- `AttentionBanner` — unchanged
- `MaterialResponsibilityCard` — unchanged (but only shows when not yet set)

## Role-Specific Views

### GC View
- Section A: Shows contract with TC name, work orders total, billing/cash
- Section B: Material budget (if GC responsible) + Labor budget (always editable)
- Section C: Recent WOs, Invoices, RFIs, Team, Scope

### TC View
- Section A: Shows incoming contract (GC), outgoing contract (FC if exists), work orders, billing/cash, **Live Position**
- Section B: Material budget (if TC responsible) + Labor budget (always editable)
- Section C: Recent WOs, Invoices, RFIs, Team, Scope + Margin Trend chart

### FC View
- Section A: Shows contract with TC, earned (approved WOs), invoiced, retainage, remaining balance
- Section B: Hidden (FC doesn't manage budgets)
- Section C: Recent WOs, Invoices, Team

### Supplier View
- Section A: Order Value, Invoiced, Paid, Outstanding
- Section B: Material Budget (if designated supplier, editable)
- Section C: Recent Invoices

## Technical Changes

### Files Modified
1. **`src/components/project/FinancialSnapshot.tsx`** (NEW) — Consolidated Section A component with collapsible support
2. **`src/components/project/BudgetTracking.tsx`** (NEW) — Side-by-side material + labor budgets with inline editing
3. **`src/pages/ProjectHome.tsx`** — Replace 6 separate tiles with 2 new components + collapsible OperationalSummary
4. **`src/hooks/useProjectFinancials.ts`** — Filter `workOrderTotal` to only approved/contracted WOs (bug fix). Add `approvedWOCount` field.
5. **`src/components/project/index.ts`** — Update exports

### Files Removed (components no longer needed)
- `ContractSummaryTile.tsx` — merged into FinancialSnapshot
- `BillingCashTile.tsx` — merged into FinancialSnapshot
- `MaterialBudgetTile.tsx` — merged into BudgetTracking
- `LaborBudgetTile.tsx` — merged into BudgetTracking
- `FinancialSignalBar.tsx` — fully replaced
- `FinancialHealthCharts.tsx` — material chart merged into BudgetTracking, margin trend into FinancialSnapshot

### Hook Fix: useProjectFinancials.ts
```typescript
// Line 252: Filter to only approved/contracted
const approvedWOs = wos.filter(wo => 
  ['approved', 'contracted'].includes(wo.status)
);
const woTotal = approvedWOs.reduce((sum, wo) => 
  sum + (wo.final_price || 0), 0
);
```
Add `approvedWOCount: number` to the interface for display ("4 WOs").

### New Component: FinancialSnapshot
- Uses Collapsible from radix for expand/collapse
- Renders different metric rows based on `viewerRole`
- Includes TC "Live Position" metric with green/red color
- Contract editing inline (moved from FinancialSignalBar)
- FC contract creation flow (moved from FinancialSignalBar)

### New Component: BudgetTracking
- Side-by-side grid (1 col mobile, 2 col desktop)
- Material budget: only shown to responsible party or designated supplier
- Labor budget: shown to GC and TC with inline edit
- Includes over/under indicators, projected impact line
- Incorporates material budget edit flow from FinancialSignalBar

### OperationalSummary Wrapper
- Wrap existing OperationalSummary in a Collapsible with a header button
- Default collapsed to reduce initial scroll depth
- Shows count badges in header ("4 WOs, 1 Invoice, 0 RFIs")

## Design Pattern
- All sections use existing `border bg-card p-3` tile style
- Collapsible headers use `ChevronDown` rotation pattern
- Color coding: green (healthy), amber (watch), red (over budget) — same as existing
- No new dependencies needed — uses existing radix Collapsible
