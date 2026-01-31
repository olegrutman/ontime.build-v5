
# Plan: Fix FC Contract Visibility and Allow TC to Add FC Contract Price

## Problem Summary

Two related issues:
1. When FC accepts a project invite from TC, they should only see the TC→FC contract value, not the GC→TC contract price
2. TC needs a way to add/set the contract price with FC directly from the project overview page

## Root Cause Analysis

### Issue 1: FC Contract Visibility
The dashboard hook (`useDashboardData.ts`) fetches contracts and filters by role:
```typescript
} else if (orgType === 'FC') {
  const fcContract = projectContracts.find(c => c.to_role === 'Field Crew');
  contractValue = fcContract?.contract_sum || null;
}
```

This correctly looks for FC contracts, but the problem is:
- RLS on `project_contracts` allows viewing if user's org is in `from_org_id` OR `to_org_id`
- If no TC→FC contract exists yet, the FC might see the GC→TC contract (if RLS allows them as project creator - edge case)
- The `ProjectContractsSection` on overview also needs to filter properly

### Issue 2: Missing TC→FC Contract Creation
When TC invites FC via `AddTeamMemberDialog`:
- Only a `project_team` record is created
- No contract is created (unlike `EditProject.tsx` which creates contracts)
- TC has no UI to add the contract price from the project overview

## Solution

### 1. Dashboard Contract Filtering (useDashboardData.ts)

Add additional filtering to ensure FC only sees contracts where their org is explicitly involved:

```typescript
} else if (orgType === 'FC') {
  // FC sees their contract (from TC to FC) only if they are the to_org
  const fcContract = projectContracts.find(c => 
    c.to_role === 'Field Crew' && c.to_org_id === currentOrg.id
  );
  contractValue = fcContract?.contract_sum || null;
}
```

**Changes needed:**
- Modify the contracts query to also fetch `from_org_id` and `to_org_id`
- Update the FC filtering logic to check org IDs

### 2. ProjectContractsSection Filtering

The current filtering in `ProjectContractsSection.tsx` (lines 99-111) already filters by org:
```typescript
const visibleContracts = currentOrgId 
  ? allContracts.filter(c => 
      c.from_org_id === currentOrgId || c.to_org_id === currentOrgId
    )
  : allContracts;
```

This is correct - FC will only see contracts where they are involved. No changes needed here.

### 3. Enable TC to Add FC Contract (ProjectFinancialsSectionNew.tsx)

When TC views the project overview and no TC→FC contract exists, show an "Add Contract" UI:

**Current behavior (lines 406-426):**
```typescript
{hasDownstream ? (
  <EditableContractValue ... />
) : (
  <p className="text-sm text-muted-foreground italic">Not configured</p>
)}
```

**New behavior:**
- Instead of just "Not configured", show an "Add Contract" button
- When clicked, show an inline form to enter contract sum and retainage
- On save, create the TC→FC contract record

### 4. Create Contract on Team Member Add (AddTeamMemberDialog.tsx)

When TC adds an FC via the team dialog, automatically create a placeholder contract:

**File: `src/components/project/AddTeamMemberDialog.tsx`**

After inserting into `project_team`, also create a `project_contracts` record:
```typescript
// If TC is inviting FC, create a placeholder contract
if (selectedRole === 'Field Crew') {
  await supabase.from('project_contracts').insert({
    project_id: projectId,
    from_org_id: currentOrgId, // TC's org
    to_org_id: selectedResult.org_id, // FC's org
    from_role: 'Trade Contractor',
    to_role: 'Field Crew',
    trade: selectedTrade || null,
    contract_sum: 0, // Placeholder - TC can edit later
    retainage_percent: 0,
    created_by_user_id: user.id,
  });
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useDashboardData.ts` | Add `from_org_id`, `to_org_id` to contracts query; filter FC contracts by org ID |
| `src/components/project/ProjectFinancialsSectionNew.tsx` | Add "Create Contract" UI for TC when no FC contract exists |
| `src/components/project/AddTeamMemberDialog.tsx` | Create TC→FC contract when TC invites FC |

## Technical Details

### useDashboardData.ts Changes

Line 153-159 - Update contracts query:
```typescript
let contracts: { 
  project_id: string; 
  to_role: string; 
  from_role: string; 
  contract_sum: number;
  from_org_id: string | null;
  to_org_id: string | null;
}[] = [];
if (projectIds.length > 0) {
  const { data } = await supabase
    .from('project_contracts')
    .select('project_id, to_role, from_role, contract_sum, from_org_id, to_org_id')
    .in('project_id', projectIds);
  contracts = data || [];
}
```

Lines 327-331 - Update FC filtering:
```typescript
} else if (orgType === 'FC') {
  // FC only sees contracts where their org is the recipient (to_org_id)
  const fcContract = projectContracts.find(c => 
    c.to_role === 'Field Crew' && c.to_org_id === currentOrg.id
  );
  contractValue = fcContract?.contract_sum || null;
}
```

### ProjectFinancialsSectionNew.tsx Changes

Add a new component for creating contracts, and modify the TC downstream contract section to show this when no contract exists.

### AddTeamMemberDialog.tsx Changes

In `handleAddExisting()`, after the team insert succeeds, add contract creation for FC invites.

## Expected Behavior After Fix

1. **FC Dashboard**: FC will only see contract value if a TC→FC contract exists and they are the `to_org`. If no TC→FC contract exists, contract value shows as "—" (null).

2. **TC Project Overview**: TC will see "Add Contract" button in the FC contract card if no contract exists. Clicking it allows inline entry of contract sum and retainage.

3. **TC Inviting FC**: When TC adds an FC via Add Team Member dialog, a placeholder contract is created with $0 value, which TC can then edit from the overview page.

## Testing Scenarios

1. TC invites FC to project → verify contract placeholder is created with $0
2. FC accepts invite → verify FC dashboard shows "—" for contract (not GC→TC value)
3. TC edits FC contract value from overview → verify FC can now see their contract value
4. FC views project overview → verify FC only sees TC→FC contract, not GC→TC
