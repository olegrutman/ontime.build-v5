
# Bug Fix: Contract Prices Not Saving/Displaying Correctly

## Problem Summary

When a GC creates a project through the wizard:
1. Contract prices entered in the Contracts step are saved as `$0` in the database
2. Trade Contractor contracts are missing entirely
3. These incorrect values propagate to the Project Overview page and SOV page

## Root Cause Analysis

After investigating the code flow and database state, I identified **two distinct issues**:

### Issue 1: Contract Sum Saved as 0

**Location**: `src/components/project-wizard-new/ContractsStep.tsx` (lines 111-121)

When the ContractsStep component pre-populates contracts for team members, it creates default objects with `contractSum: 0`. The user enters values, but there's a **race condition**:

1. The `useEffect` runs and creates contracts with `contractSum: 0`
2. User enters a value (e.g., `$50,000`)
3. The `onChange` callback updates parent state
4. User clicks "Next" - but the `saveContracts` function runs immediately
5. If state hasn't fully propagated, the old `0` value gets saved

**Evidence**: Database shows `contract_sum: 0.00` for the Supplier contract despite the user likely entering a value.

### Issue 2: Trade Contractor Contract Missing

**Location**: `src/pages/CreateProjectNew.tsx` (lines 291-330)

The `saveContracts` function iterates over `data.contracts`, but if a contract wasn't added to the state (due to the timing issue in Issue 1), it never gets saved.

**Evidence**: Database shows `contract_id: <nil>` for the Trade Contractor team member.

---

## Solution

### Fix 1: Ensure Contract State is Synchronized Before Navigation

**File**: `src/pages/CreateProjectNew.tsx`

Before navigating from the Contracts step, ensure the latest contract data is captured by:
- Calling `saveContracts` with the actual form data rather than relying on stale state
- Or modifying the step navigation to wait for state updates

### Fix 2: Ensure All Downstream Members Get Contracts

**File**: `src/pages/CreateProjectNew.tsx`

In the `saveContracts` function, add a fallback that creates contracts for any team members that should have one but don't exist in the `data.contracts` array:

```typescript
// After processing existing contracts, check for missing ones
const dbDownstreamMembers = dbTeamMembers?.filter(m => 
  (creatorRole === 'General Contractor' && (m.role === 'Trade Contractor' || m.role === 'Supplier')) ||
  (creatorRole === 'Trade Contractor' && (m.role === 'Field Crew' || m.role === 'Supplier'))
);

for (const member of dbDownstreamMembers || []) {
  const hasContract = data.contracts.some(c => c.toTeamMemberId === member.id);
  if (!hasContract) {
    // Create a default contract for members without one
    // ...
  }
}
```

### Fix 3: Add Validation on Contract Values

**File**: `src/components/project-wizard-new/ContractsStep.tsx`

Add visual feedback when contract sum is 0 or empty, encouraging users to enter a value before proceeding.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/CreateProjectNew.tsx` | Update `saveContracts` to handle missing contracts and ensure proper data capture |
| `src/components/project-wizard-new/ContractsStep.tsx` | Add validation indicator for zero-value contracts |

---

## Technical Details

### CreateProjectNew.tsx Changes

1. **Modify `saveContracts` function** to:
   - Log all contracts being processed for debugging
   - Create missing contracts for downstream team members
   - Handle the case where a team member exists but no contract was defined

```typescript
const saveContracts = async (projectId: string) => {
  // Fetch team members from database
  const { data: dbTeamMembers } = await supabase
    .from('project_team')
    .select('id, role, trade, trade_custom, invited_org_name, org_id')
    .eq('project_id', projectId);
  
  // Determine which team members SHOULD have contracts
  const membersNeedingContracts = (dbTeamMembers || []).filter(m => {
    if (creatorRole === 'General Contractor') {
      return m.role === 'Trade Contractor' || m.role === 'Supplier';
    }
    if (creatorRole === 'Trade Contractor') {
      return m.role === 'Field Crew' || m.role === 'Supplier';
    }
    return false;
  });

  // Process each member that needs a contract
  for (const teamMember of membersNeedingContracts) {
    const contract = data.contracts.find(c => c.toTeamMemberId === teamMember.id);
    
    const payload = {
      project_id: projectId,
      from_org_id: currentOrg?.id,
      from_role: creatorRole,
      to_role: teamMember.role,
      trade: teamMember.trade,
      to_project_team_id: teamMember.id,
      to_org_id: teamMember.org_id,
      contract_sum: contract?.contractSum || 0,
      retainage_percent: contract?.retainagePercent || 0,
      allow_mobilization_line_item: contract?.allowMobilization || false,
      notes: contract?.notes || null,
      created_by_user_id: user?.id,
    };
    
    // Upsert the contract
    // ...
  }
};
```

### ContractsStep.tsx Changes

Add a visual indicator for contracts with zero value:

```tsx
<Input
  type="number"
  value={contract.contractSum || ''}
  onChange={(e) => onUpdate({ contractSum: parseFloat(e.target.value) || 0 })}
  className={cn("pl-7", contract.contractSum === 0 && "border-amber-300")}
/>
{contract.contractSum === 0 && (
  <p className="text-xs text-amber-600 mt-1">
    Enter the contract sum for this party
  </p>
)}
```

---

## Testing Checklist

After implementation:
1. Create a new project as GC
2. Add a Trade Contractor and Supplier to the team
3. Enter contract values ($50,000 for TC, $10,000 for Supplier)
4. Complete the wizard
5. Navigate to Project Overview
6. Verify Contract Summary shows correct values
7. Navigate to SOV page
8. Verify contract values are reflected in SOV generation
