

# Fix: Link FC Org to Contract on Invite Accept + Backfill Existing Data

## Root Cause
When the TC creates a project, the FC contract is created with `from_org_id = NULL` (FC org unknown at that time). When the FC accepts the invite, the `accept_project_invite` RPC updates `project_team.org_id` but never updates `project_contracts.from_org_id`. 

Because of this:
1. **RLS blocks the FC from seeing their own contract** — the SELECT policy requires `from_org_id` or `to_org_id` to match the user's org
2. **SOV is also invisible** — the SOV SELECT policy joins through `project_contracts` which the FC can't see
3. **All financial data shows as $0/empty** on the FC overview

## Fix (2 parts)

### 1. Update `accept_project_invite` RPC to link org to contracts
Add logic at the end of the function: after updating `project_team`, also update any `project_contracts` where the accepted role matches and the org_id slot is NULL.

For FC accepting: update contracts where `from_role = 'Field Crew' AND from_org_id IS NULL` → set `from_org_id = _user_org_id`.
For GC/TC accepting: similar logic for their respective contract slots.

### 2. Backfill the existing broken contract
Run a one-time data fix to set `from_org_id` on the FC contract `0df5ee92-3142-4c1e-97aa-f50c6628142f` to the FC org `a59cd1fd-8527-41a6-a21d-30d0f9fa11ad`.

## Changes

| Type | Detail |
|------|--------|
| **Migration** | Update `accept_project_invite` function to also link org to contracts; backfill existing NULL org_ids on contracts |

No frontend code changes needed — once the data is correct, existing queries and RLS policies will work.

