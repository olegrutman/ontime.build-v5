
# Plan: Add TC-FC Contract Management

## Problem Summary

When a GC creates a project with a TC but no FC, and the TC later invites FC members to the project, the TC has no way to set contract values for those FC relationships. This happens because:

1. The "Invite by Email" flow doesn't create contracts (only "Search Existing" does)
2. There's no link from the project overview to edit contracts
3. The existing EditProject contracts tab doesn't properly filter contracts to show only relevant ones to the current user

---

## Solution Overview

### Part 1: Fix Contract Creation for Email Invites

When TC invites FC by email, create the contract record (just like "Search Existing" does).

**File**: `src/components/project/AddTeamMemberDialog.tsx`

**Changes**:
- In `handleInviteByEmail`, after creating the project_team and project_invites records, also create a project_contracts record
- Use the same logic as `handleAddExisting` to determine contract direction
- The contract will be created with `contract_sum: 0` initially (can be edited later)

---

### Part 2: Add Edit Link to ProjectContractsSection

Add a way for users to navigate to edit their contracts from the project overview.

**File**: `src/components/project/ProjectContractsSection.tsx`

**Changes**:
- Add a "Manage Contracts" button in the card header (visible only to GC_PM and TC_PM roles)
- Link to `/project/{id}/edit?step=contracts`
- Allow inline editing for contract values (contract sum, retainage, mobilization)

---

### Part 3: Filter Contracts in EditProject

Ensure the EditProject page only shows contracts relevant to the current user's organization.

**File**: `src/pages/EditProject.tsx`

**Changes**:
- Filter existing contracts to only show those where the current org is either `from_org_id` or `to_org_id`
- This respects the existing RLS but adds UI-level filtering for clarity

---

## Technical Details

### Part 1: handleInviteByEmail Contract Creation

```typescript
// After creating project_team and project_invites...

// Create contract if applicable (not for Suppliers)
if (inviteForm.role !== 'Supplier') {
  const isCreatorUpstream = 
    (currentOrgType === 'GC') ||
    (currentOrgType === 'TC' && inviteForm.role === 'Field Crew');

  const contractPayload = isCreatorUpstream ? {
    project_id: projectId,
    from_org_id: null, // Invitee org not known yet
    from_role: inviteForm.role,
    to_org_id: currentOrgId,
    to_role: creatorRoleLabel,
    trade: inviteForm.trade || null,
    to_project_team_id: teamMember.id,
    contract_sum: 0,
    retainage_percent: 0,
    created_by_user_id: user.id,
  } : {
    // Creator is worker, invitee is payer
    project_id: projectId,
    from_org_id: currentOrgId,
    from_role: creatorRoleLabel,
    to_org_id: null,
    to_role: inviteForm.role,
    trade: inviteForm.trade || null,
    to_project_team_id: teamMember.id,
    contract_sum: 0,
    retainage_percent: 0,
    created_by_user_id: user.id,
  };

  await supabase.from('project_contracts').insert(contractPayload);
}
```

### Part 2: ProjectContractsSection Edit Capability

Add a "Manage" button and inline editing:

```typescript
// In CardHeader
<div className="flex items-center gap-2">
  <CardTitle>Contract Summary</CardTitle>
  {canManageContracts && (
    <Button size="sm" variant="outline" asChild>
      <Link to={`/project/${projectId}/edit?step=contracts`}>
        <Settings className="h-3 w-3 mr-1" />
        Manage
      </Link>
    </Button>
  )}
</div>
```

### Part 3: Filter Contracts in EditProject

```typescript
// When fetching contracts
const visibleContracts = (contracts || []).filter(c => 
  c.from_org_id === currentOrg?.id || c.to_org_id === currentOrg?.id
);
setExistingContracts(visibleContracts as ExistingContract[]);
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/project/AddTeamMemberDialog.tsx` | Add contract creation to `handleInviteByEmail` |
| `src/components/project/ProjectContractsSection.tsx` | Add "Manage Contracts" button |
| `src/pages/EditProject.tsx` | Filter contracts by user's org |

---

## Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| TC invites FC by email | No contract created | Contract created with $0 sum |
| TC views project overview | No way to edit contracts | "Manage" button links to edit page |
| TC opens Edit Project → Contracts | Sees all project contracts | Only sees TC-GC and TC-FC contracts |

---

## Permissions

- Only users with `canInviteMembers` permission can create contracts
- Contract editing is available to the org that is party to the contract
- RLS policies on `project_contracts` already enforce this at the database level
