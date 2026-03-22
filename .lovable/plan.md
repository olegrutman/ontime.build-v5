

# Connect Contracts Page to `project_contracts` Table

## Problem
The `ProjectContractsPage` `handleSave` currently just shows a toast and navigates away — it never writes to `project_contracts`. So the contract sum entered there is lost and never appears in the ContractHeroCard or financial system.

## What needs to happen

The `handleSave` function must **upsert** into `project_contracts` for each team member with a contract value entered. The financial system (`useProjectFinancials`) already reads from `project_contracts` using `from_org_id`, `to_org_id`, `from_role`, `to_role`, `contract_sum` — so the insert must populate these fields correctly.

### Contract direction rules (from memory context)
- `from_org_id` = the contractor (the one who sends invoices / does work)
- `to_org_id` = the client (the one who pays)
- GC creator entering TC contract: `from_org_id = TC's org_id`, `to_org_id = GC's org_id (project org)`, `from_role = 'Trade Contractor'`, `to_role = 'General Contractor'`
- TC creator entering FC contract: `from_org_id = FC's org_id`, `to_org_id = TC's org_id`, `from_role = 'Field Crew'`, `to_role = 'Trade Contractor'`
- TC creator entering GC contract: `from_org_id = TC's org_id`, `to_org_id = GC's org_id`, `from_role = 'Trade Contractor'`, `to_role = 'General Contractor'`

### Changes to `src/pages/ProjectContractsPage.tsx`

1. **Get current user's org ID** — fetch from `useAuth()` or `user_org_roles`
2. **`handleSave`** — for each team member with a contract value:
   - Check if a `project_contracts` row already exists for this project + team member pair (use `to_project_team_id`)
   - If exists: UPDATE `contract_sum`
   - If not: INSERT with correct `from_org_id`, `to_org_id`, `from_role`, `to_role`, `contract_sum`, `project_id`, `to_project_team_id`, `created_by_user_id`
3. **Initialize state from existing contracts** — fix the init logic to use `to_project_team_id` as the key (matching team member `id`)
4. **Invalidate queries** — after save, invalidate `['project_contracts']` and `['project_financials']` so the ContractHeroCard refreshes
5. **Add `useAuth`** import to get `user.id` and org membership

### File changes

| File | Change |
|------|--------|
| `src/pages/ProjectContractsPage.tsx` | Add real upsert logic in handleSave, fix init from existing, get user's org |

