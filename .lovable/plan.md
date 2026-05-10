# Fix CO KPI Math

## Problem

The "CO impact" card and the "Approved CO Adds" KPI in the Project Financial Command strip both read `approvedEstimateSum`, which is sourced from the **`supplier_estimates`** table (material estimate PDFs) — not from `change_orders`. Cost is hardcoded at 72% of revenue and pending exposure is hardcoded to 0.

On the current project this means 2 approved COs show as $0 across all CO KPIs.

## Goal

Compute CO KPIs from real `change_orders` data, mirroring the same aggregation rules the new CO PDF uses (viewer-scoped, GC privacy via `tc_submitted_price`).

## Changes

### 1. `src/hooks/useProjectFinancials.ts`

Add four new fields to `ProjectFinancials` and populate them alongside the existing fetch:

- `approvedCORevenue: number` — sum of approved CO net amounts (viewer-scoped to user's org as billing side)
- `approvedCOCost: number` — same set, but raw cost (labor cost + material cost + equipment cost, no markup)
- `approvedCOMargin: number` — `approvedCORevenue − approvedCOCost`
- `pendingCOExposure: number` — sum for COs in `submitted`, `closed_for_pricing`, `shared`, `work_in_progress`
- `approvedWOTotal: number` — same as `approvedCORevenue` but filtered to `document_type = 'WO'` (T&M mode)

Aggregation rule (per CO):
- If viewer is GC and CO has `tc_submitted_price` → use that as revenue, skip labor recompute
- Else: revenue = sum(`co_labor_entries.line_total`) + sum(`co_material_items.billed_amount`) + sum(`co_equipment_items.billed_amount`), filtered to viewer's `org_id`
- Cost = sum of the same three tables but using `line_total` minus markup for materials/equipment, and labor `line_total` (TC perspective) — no viewer markup applied

Keep `approvedEstimateSum` as-is — it remains valid for the material-estimate fallback in `materialEstimate`. Just stop using it for CO math.

### 2. `src/components/project/COImpactCard.tsx`

Replace hardcoded math with the new fields:
```ts
const revenue = financials.approvedCORevenue;
const cost    = financials.approvedCOCost;
const margin  = financials.approvedCOMargin;
const pending = financials.pendingCOExposure;
```
Hide card when both `revenue === 0` and `pending === 0`. T&M mode uses `approvedWOTotal` for revenue and same cost/margin/pending logic.

### 3. `src/components/project/ProjectFinancialCommand.tsx`

- GC + TC strips: `coAdds = financials.approvedCORevenue` (was `approvedEstimateSum`)
- T&M strip: `tmTotal = financials.approvedWOTotal` (was `approvedEstimateSum`)

## Out of scope

- No DB schema or RLS changes
- No edits to `apply_co_contract_delta` trigger or `project_contracts.contract_sum`
- No CO PDF changes (already correct)
- `materialEstimate` fallback to `approvedEstimateSum` stays untouched
- No changes to dashboard-level KPIs (`DashboardKPIs.tsx`) — those don't reference CO totals
