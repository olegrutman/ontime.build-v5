

# Plan: Fix Contract Values Not Showing on Overview Page

## Problem Analysis

When a Trade Contractor creates a project and adds contract values in the wizard, those values don't appear on the overview page for any contractor account.

### Root Cause

There are **duplicate contracts** in the database for the same party relationships:

| Contract ID | Contract Sum | Created At | to_project_team_id |
|-------------|-------------|------------|-------------------|
| ba72fe23... | **$0.00** | 19:24:32 | **null** |
| 1364fdc5... | **$1,500,000** | 19:31:18 | 5f10a94b... |

The duplication occurs because:

1. **AddTeamMemberDialog** creates a contract with `contract_sum: 0` and **no `to_project_team_id`** when a team member is added
2. **saveContracts** (in CreateProjectNew.tsx) looks for existing contracts by `to_project_team_id` to update them
3. Since the original contract has `to_project_team_id: null`, no match is found, so a NEW contract is created with the actual values

The **UI displays $0** because:
- The fetch query has no explicit ordering
- `.find()` returns the **first match** (the older $0 contract)
- The newer contract with actual values is ignored

---

## Solution

Fix the root cause by ensuring `saveContracts` matches existing contracts by organization IDs (which are always populated) instead of relying on `to_project_team_id`.

### Changes Required

| File | Change |
|------|--------|
| `src/pages/CreateProjectNew.tsx` | Update `saveContracts` to match contracts by org IDs |
| Database cleanup | Delete duplicate $0 contracts |

---

## Technical Implementation

### 1. Fix saveContracts Matching Logic

**File: `src/pages/CreateProjectNew.tsx`**

Currently, the code fetches existing contracts and matches by `to_project_team_id`:

```typescript
// Current (broken)
const { data: existingContracts } = await supabase
  .from('project_contracts')
  .select('id, to_project_team_id')
  .eq('project_id', projectId);

const existing = existingContracts?.find((c) => c.to_project_team_id === teamMember.id);
```

Change to match by organization IDs instead:

```typescript
// Fixed - match by from_org_id and to_org_id
const { data: existingContracts } = await supabase
  .from('project_contracts')
  .select('id, from_org_id, to_org_id, to_project_team_id')
  .eq('project_id', projectId);

// Match by the org IDs we're about to insert
const existing = existingContracts?.find((c) => {
  if (isCreatorUpstream) {
    return c.from_org_id === teamMember.org_id && c.to_org_id === currentOrg?.id;
  } else {
    return c.from_org_id === currentOrg?.id && c.to_org_id === teamMember.org_id;
  }
});
```

### 2. Also Update to_project_team_id on Existing Contracts

When updating an existing contract, ensure `to_project_team_id` is set:

```typescript
const payload = {
  // ... existing fields ...
  to_project_team_id: teamMember.id, // Always set this
};
```

### 3. Clean Up Duplicate Contracts (One-time Database Fix)

Delete the duplicate $0 contracts that have no `to_project_team_id`:

```sql
-- Delete duplicate contracts where contract_sum = 0 
-- and a newer contract exists with the same party relationship
DELETE FROM project_contracts pc1
WHERE pc1.contract_sum = 0
  AND pc1.to_project_team_id IS NULL
  AND EXISTS (
    SELECT 1 FROM project_contracts pc2
    WHERE pc2.project_id = pc1.project_id
      AND pc2.from_org_id = pc1.from_org_id
      AND pc2.to_org_id = pc1.to_org_id
      AND pc2.id != pc1.id
      AND pc2.contract_sum > 0
  );
```

---

## Why This Fixes the Problem

1. **Matching by org IDs** ensures we find the contract even if `to_project_team_id` wasn't set during initial creation
2. **Updating existing contracts** instead of creating duplicates keeps the data clean
3. **Setting `to_project_team_id`** on update ensures the contract links properly to the team member
4. **Cleaning up duplicates** fixes the existing bad data

---

## Alternative Consideration: Add Unique Constraint

To prevent this issue in the future, consider adding a unique constraint on `(project_id, from_org_id, to_org_id)` to prevent duplicate contracts for the same party relationship:

```sql
CREATE UNIQUE INDEX unique_contract_parties 
ON project_contracts(project_id, from_org_id, to_org_id);
```

This would cause the duplicate insert to fail, forcing an update instead.

---

## Testing Checklist

1. Clean up existing duplicate contracts in database
2. Log in as TC and create a new project
3. Add a GC and FC to the team
4. Enter contract values on the Contracts step
5. Complete the wizard
6. Verify contract values appear on the Project Overview
7. Log in as GC and verify contract values are visible
8. Log in as FC and verify contract values are visible
9. Edit the project and change contract values
10. Verify the updated values appear (no new duplicates created)

