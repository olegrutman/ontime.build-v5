

# Remove Work Order References from Overview Page

## Problem
The project overview page still shows Work Order data in the `CollapsibleOperations` section and `OperationalSummary` component — displaying "Recent Work Orders" list and WO count badge even though the WO feature has been removed.

## Changes

### 1. `src/pages/ProjectHome.tsx` — `CollapsibleOperations` component (lines 74-112)
- Remove `woCount` variable and the `{woCount} WOs ·` text from the badge
- Update label to just show invoice count

### 2. `src/components/project/OperationalSummary.tsx`
- **Delete** the entire "Recent Work Orders" card (lines 126-163) — the first `<div className="border bg-card p-3">` block that renders `recentWorkOrders`
- Remove `recentWorkOrders` destructuring from `financials`
- Remove `useNavigate` import and usage (only used for WO click handler)
- Change grid from `grid-cols-2` to single column for remaining cards, or keep 2-col with invoices + RFIs side by side

### 3. `src/hooks/useProjectFinancials.ts`
- Remove `recentWorkOrders` from the `ProjectFinancials` interface
- Remove the state variable and the query that fetches work orders from `change_order_projects`
- Remove from the return object
- Remove `workOrderTotal`, `approvedWOCount`, `monthlyWOData` and related WO financial calculations

This removes all Work Order data from the overview while keeping invoices, RFIs, and scope summary intact.

