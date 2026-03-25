

# Bug: Contract values not populating on Contracts page

## Root Cause

The existing `project_contracts` rows have `to_project_team_id = NULL`. The initialization `useEffect` in `ProjectContractsPage.tsx` uses `to_project_team_id` as the lookup key — since it's null, all contracts are skipped and inputs show empty.

**Data proof:**
- Contract `c6b77d34` → TC→GC, sum=150000, `to_project_team_id = NULL`
- Contract `05a1c360` → FC→TC, sum=100000, `to_project_team_id = NULL`
- Team members exist with matching `org_id` values

## Fix (single file: `ProjectContractsPage.tsx`)

### 1. Fix initialization — match contracts to team members by org_id fallback

When `to_project_team_id` is null, match the contract to a team member using the counterparty's `org_id`. For a TC-created project:
- GC contract: `from_org_id` matches the creator → counterparty is `to_org_id` → find team member with that `org_id`
- FC contract: `to_org_id` matches the creator → counterparty is `from_org_id` → find team member with that `org_id`

```typescript
// Replace the useEffect that initializes contracts
useEffect(() => {
  if (existingContracts.length === 0 || team.length === 0) return;
  const initC: Record<string, string> = {};
  const initR: Record<string, string> = {};
  for (const c of existingContracts) {
    // Find matching team member: by to_project_team_id or by org_id
    let teamMemberId = c.to_project_team_id;
    if (!teamMemberId) {
      // Match by org: the "other party" org should match a team member's org_id
      const counterpartyOrgId = c.from_org_id === project?.organization_id 
        ? c.to_org_id : c.from_org_id;
      const match = team.find(m => m.org_id === counterpartyOrgId);
      teamMemberId = match?.id ?? null;
    }
    if (teamMemberId) {
      if (c.contract_sum != null) initC[teamMemberId] = String(c.contract_sum);
      if (c.retainage_percent != null) initR[teamMemberId] = String(c.retainage_percent);
    }
  }
  if (Object.keys(initC).length > 0) setContracts(initC);
  if (Object.keys(initR).length > 0) setRetainages(initR);
}, [existingContracts, team, project]);
```

### 2. Fix save — also set `to_project_team_id` on update

When updating an existing contract that has `to_project_team_id = NULL`, backfill it:

```typescript
// In handleSave, when updating existing contract:
await supabase
  .from('project_contracts')
  .update({ 
    contract_sum: contractSum, 
    retainage_percent: retainagePercent,
    to_project_team_id: member.id  // backfill
  })
  .eq('id', existing.id);
```

### 3. Fix existing contract lookup in save

The `existing` lookup also relies on `to_project_team_id`. Add org_id fallback:

```typescript
const existing = existingContracts.find(c => {
  if (c.to_project_team_id === member.id) return true;
  // Fallback: match by counterparty org
  const counterpartyOrgId = c.from_org_id === project?.organization_id 
    ? c.to_org_id : c.from_org_id;
  return counterpartyOrgId === member.org_id;
});
```

This ensures existing contracts display their values AND future saves backfill the `to_project_team_id` for consistency.

