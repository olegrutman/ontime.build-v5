
# Bug Fix: GC Cannot Create Contracts with Suppliers

## Problem Analysis

When a General Contractor (GC) creates a project, they can correctly add Trade Contractors (TC) and Suppliers to the team. However, in the **Contracts Step**, only TC contracts are shown - **Suppliers are missing**.

### Root Cause
In `ContractsStep.tsx`, the `downstreamMembers` filter logic only includes Trade Contractors when the creator is a GC:

```typescript
// Current logic (lines 69-78)
const downstreamMembers = useMemo(() => {
  return teamMembers.filter(m => {
    if (creatorRole === 'General Contractor') {
      return m.role === 'Trade Contractor';  // Suppliers excluded!
    }
    // ...
  });
}, [teamMembers, creatorRole]);
```

The database schema (`project_contracts.to_role_check` constraint) explicitly allows Suppliers as valid contract recipients.

---

## Solution

### Update ContractsStep.tsx

Modify the `downstreamMembers` filter to include Suppliers when the creator is a GC or TC:

| Creator Role | Can Contract With |
|--------------|-------------------|
| General Contractor | Trade Contractor, Supplier |
| Trade Contractor | Field Crew, Supplier |

### Changes Required

**File: `src/components/project-wizard-new/ContractsStep.tsx`**

Update the `downstreamMembers` memo (around lines 69-79):

```typescript
const downstreamMembers = useMemo(() => {
  return teamMembers.filter(m => {
    if (creatorRole === 'General Contractor') {
      // GC can have contracts with TC and Supplier
      return m.role === 'Trade Contractor' || m.role === 'Supplier';
    }
    if (creatorRole === 'Trade Contractor') {
      // TC can have contracts with FC and Supplier
      return m.role === 'Field Crew' || m.role === 'Supplier';
    }
    return false;
  });
}, [teamMembers, creatorRole]);
```

Update the helper message (around line 249) to reflect that GCs contract with both TCs and Suppliers:

```typescript
<span>
  {creatorRole === 'Trade Contractor' 
    ? 'Contracts with Field Crew and Suppliers' 
    : 'Contracts with Trade Contractors and Suppliers'}
</span>
```

Update the empty state message (around line 197):

```typescript
{creatorRole === 'General Contractor' 
  ? 'Add a Trade Contractor or Supplier on the Project Team step first.'
  : 'Add a General Contractor on the Project Team step first (required). Add Field Crew or Suppliers on the Project Team step (optional).'}
```

---

## Technical Details

### Database Validation (Already Correct)
The `project_contracts` table has these constraints:
- `from_role`: GC, TC, or FC
- `to_role`: GC, TC, FC, **or Supplier**

No database changes are needed.

### Contract Save Logic (Already Correct)
In `CreateProjectNew.tsx`, the `saveContracts` function already handles all team member roles - it only skips Suppliers explicitly, which needs to be removed:

```typescript
// Line 301-303 needs update
// REMOVE this check:
if (teamMember.role === 'Supplier') {
  continue;  // Remove this - Suppliers should have contracts
}
```

---

## Files to Modify

1. **`src/components/project-wizard-new/ContractsStep.tsx`**
   - Update `downstreamMembers` filter to include Suppliers
   - Update section label text
   - Update empty state messaging

2. **`src/pages/CreateProjectNew.tsx`**
   - Remove the skip logic for Supplier contracts in `saveContracts` function

---

## Testing Checklist

After implementation:
1. Create a project as a GC
2. Add a Trade Contractor to the team
3. Add a Supplier to the team
4. Navigate to Contracts step
5. Verify both TC and Supplier contracts appear
6. Enter contract values for both
7. Complete project creation
8. Verify contracts are saved in database
