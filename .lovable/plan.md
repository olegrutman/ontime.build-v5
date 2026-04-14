

# Add SOV Tab to Platform Project Detail Page

## What
Add a new "SOV" tab to the platform project detail page (`/platform/projects/:id`) so platform owners can view all Schedule of Values for a project — read-only, showing each contract's SOV with its line items, percentages, values, and lock status.

## Approach
Add a third tab "SOV" next to "Overview" and "Setup Review" in `PlatformProjectDetail.tsx`. When selected, it fetches all `project_sov` records for the project, joined with their `project_sov_items` and the contract info, then displays them in a clean table format grouped by contract.

### Data fetching
- Query `project_sov` where `project_id = :id`, join to `project_contracts` for org names
- Query `project_sov_items` for each SOV, ordered by `sort_order`
- Show: item name, group, % of contract, scheduled value, billed to date, completion %, billing status, lock status

### UI layout
- One card per SOV/contract, showing contract parties + lock status in the header
- Table inside each card with columns: #, Item Name, Group, %, Scheduled Value, Billed, Completion %, Status
- Totals row at bottom
- "Locked" badge on locked SOVs

### RLS consideration
Platform users access via `isPlatformUser` — need to verify RLS on `project_sov` and `project_sov_items` allows platform user reads. If not, the query will use the service role implicitly available to platform users, or we add a policy.

## Files to edit
- `src/pages/platform/PlatformProjectDetail.tsx` — add SOV tab + fetch logic + render section

