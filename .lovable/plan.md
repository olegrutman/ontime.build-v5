

# Add Project-Level Actual Cost Tracker to Overview Page

## What Changes

The `actual_cost_entries` table currently requires a `change_order_id`. We need to also support **project-level** entries (no work order, just the project).

### 1. Database Migration

- Add `project_id` column (FK to `projects`) to `actual_cost_entries`, nullable
- Make `change_order_id` nullable (currently required)
- Add a check: at least one of `change_order_id` or `project_id` must be set
- Update RLS to cover project-level entries

### 2. Update `useActualCosts` Hook

Accept either `changeOrderId` or `projectId` as the scope. Query filters by whichever is provided. Also add a `useProjectActualCosts(projectId)` variant that fetches **all** entries for the project (both project-level and work-order-level) for a grand total view.

### 3. Update ProfitCard

**FC section (line 102-133):** Make the "Labor Budget" or "Contract Total" row tappable. Clicking opens `ActualCostPopup` scoped to the project. Show actual cost total and adjusted profit (Contract Total - Actual Cost instead of Contract Total - Labor Budget).

**TC section (line 136-238):** Add a tappable actual cost row. For self-performing TC, this replaces the overview-level profit calculation with real tracked costs.

### 4. ActualCostPopup Changes

- Accept optional `projectId` prop alongside `changeOrderId`
- When `projectId` is provided (no `changeOrderId`), entries are project-level
- Label changes: show "Contract Earnings" instead of work-order-specific labels

## Files

| File | Change |
|------|--------|
| Migration SQL | Make `change_order_id` nullable, add `project_id` column, add check constraint |
| `src/hooks/useActualCosts.ts` | Support `projectId` as alternative scope |
| `src/components/change-order-detail/ActualCostPopup.tsx` | Accept `projectId` prop |
| `src/components/project/ProfitCard.tsx` | Add tappable actual cost rows for FC and TC, open popup |

