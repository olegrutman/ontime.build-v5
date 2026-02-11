
# TC Dashboard: Enhanced Financial Snapshot & Hide Contract Price on Project Tiles

## Overview

For Trade Contractor users on the Dashboard, hide contract prices from project tiles and completely rework the Financial Snapshot card to show comprehensive metrics including work order financials.

## Changes

### 1. Hide Contract Price on Project Tiles for TC

**File: `src/components/dashboard/DashboardProjectList.tsx`**

Pass `orgType` down to `ProjectRow` so it can conditionally hide the contract value display when the user is a Trade Contractor.

**File: `src/components/dashboard/ProjectRow.tsx`**

- Add `orgType` prop
- When `orgType === 'TC'`, hide the contract value display (both mobile and desktop sections)

### 2. Recalculate Financial Snapshot for TC

**File: `src/hooks/useDashboardData.ts`**

Expand the `FinancialSummary` interface and calculation logic:

Current TC financial calculation only sums `project_contracts`. The new version will:

- **Total Active Contracts**: Sum of all `contract_sum` from `project_contracts` where `to_org_id === currentOrg.id` (contracts where TC is the receiver from GC)
- **Total Work Orders**: Count and total value of `change_order_projects` across all projects where the TC's org created them or is the project owner, with status in `approved` or `contracted`
- **Total Revenue**: Main contracts (from GC) + Work Order revenue (from `final_price` on contracted work orders where TC bills GC)
- **Total Costs**: Downstream contracts to FC (`from_org_id === currentOrg.id`) + Work Order labor costs
- **Total Billed**: Sum of `total_amount` from invoices where TC is the sender (`from_org_id === currentOrg.id`) and status is not DRAFT
- **Outstanding Billing**: Revenue minus Total Billed (how much is left to bill)
- **Potential Profit**: Total Revenue - Total Costs
- **Potential Profit Margin**: (Potential Profit / Total Revenue) * 100

New fields added to `FinancialSummary`:
```text
totalActiveContracts  -- main contract sum from GC
totalWorkOrders       -- count of work orders
totalWorkOrderValue   -- sum of work order final_price (contracted)
totalBilled           -- sum of non-draft invoices sent by TC
outstandingBilling    -- totalRevenue - totalBilled
potentialProfit       -- totalRevenue - totalCosts
```

The hook will fetch `change_order_projects` for all project IDs and sum `final_price` where `status = 'contracted'` to get work order revenue. It will also sum invoices where TC is the sender to get total billed amount.

### 3. Redesign Financial Card for TC

**File: `src/components/dashboard/DashboardFinancialCard.tsx`**

Update the TC-specific rendering to show:

- **Headline**: "Total Revenue" (main contracts + work orders combined)
- **Active Contracts**: Total main contract value
- **Work Orders**: Count and total value
- **Total Billed**: How much has been invoiced
- **Outstanding Billing**: Revenue minus billed
- **Costs**: Downstream costs (FC contracts)
- **Potential Profit**: Revenue - Costs with margin percentage
- **Outstanding to Collect**: Approved invoices awaiting payment (existing)

Layout uses the existing `MetricCell` component in a grid, with a separator between revenue metrics and cost/profit metrics.

## Technical Details

### Database Queries Added (in useDashboardData.ts)

1. Fetch contracted work orders:
```sql
SELECT id, project_id, final_price, status
FROM change_order_projects
WHERE project_id IN (...projectIds)
AND status = 'contracted'
```

2. Fetch total billed (non-draft invoices sent by TC):
Already have `allInvoices` -- filter where `from_org_id === currentOrg.id` and `status !== 'DRAFT'`, sum `total_amount`.

### Updated FinancialSummary Interface
```typescript
interface FinancialSummary {
  totalContracts: number;
  totalRevenue: number;
  totalCosts: number;
  profitMargin: number;
  // New TC-specific fields
  totalWorkOrders: number;
  totalWorkOrderValue: number;
  totalBilled: number;
  outstandingBilling: number;
  potentialProfit: number;
}
```

### Files Modified
- `src/hooks/useDashboardData.ts` -- expanded financial calculations with work order data
- `src/components/dashboard/DashboardFinancialCard.tsx` -- redesigned TC layout with all new metrics
- `src/components/dashboard/DashboardProjectList.tsx` -- pass orgType to ProjectRow
- `src/components/dashboard/ProjectRow.tsx` -- hide contract value for TC
