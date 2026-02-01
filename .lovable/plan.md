
# Plan: Fix FC Invoice Contract Selection Issue

## Problem Summary
Field Crew (FC) users cannot see the "main contract" when creating invoices to bill the Trade Contractor (TC). They can only see Work Order Labor contracts.

## Root Cause Analysis
The contract direction is stored **backwards** for TC-to-FC relationships:

**Current (Incorrect) Main Contract Storage:**
| Field | Value | Meaning |
|-------|-------|---------|
| `from_org_id` | TC | "Sender of invoices" |
| `to_org_id` | FC | "Payer/receiver" |

**Correct Direction Should Be:**
| Field | Value | Meaning |
|-------|-------|---------|
| `from_org_id` | FC | "Sender of invoices" (worker) |
| `to_org_id` | TC | "Payer/receiver" (hirer) |

The invoicing system filters contracts where `from_org_id === currentOrgId`. Since FC is stored as `to_org_id` in the main contract, they cannot select it.

Work Order Labor contracts work correctly because they're stored with FC as `from_org`.

---

## Solution

Fix the contract creation logic so that **the party doing the work is always `from_org`** (the invoice sender).

### Phase 1: Fix Contract Creation Logic

**Files to modify:**
- `src/pages/CreateProjectNew.tsx`
- `src/pages/EditProject.tsx`
- `src/components/project/AddTeamMemberDialog.tsx`

**Logic change:**
```
When creating a contract:
- If creator is TC and inviting FC:
  - from_org_id = FC's org (the worker/invoicer)
  - to_org_id = TC's org (the payer)
  - from_role = "Field Crew"
  - to_role = "Trade Contractor"
  
- If creator is GC and inviting TC:
  - from_org_id = TC's org (the worker/invoicer)
  - to_org_id = GC's org (the payer)
  - from_role = "Trade Contractor"
  - to_role = "General Contractor"
```

### Phase 2: Data Migration

Create a database migration to fix existing contracts:

```sql
-- Swap from/to for TC->FC contracts (where TC is incorrectly stored as from_org)
UPDATE project_contracts
SET 
  from_org_id = to_org_id,
  to_org_id = from_org_id,
  from_role = to_role,
  to_role = from_role
WHERE 
  from_role = 'Trade Contractor' 
  AND to_role = 'Field Crew'
  AND trade IS NOT NULL  -- Main contracts have a trade
  AND trade NOT IN ('Work Order', 'Work Order Labor');  -- Exclude work orders
```

### Phase 3: Fix SOV Ownership (if needed)

After swapping contract direction, verify that SOVs still reference the correct contract and that RLS policies work correctly.

---

## Implementation Details

### File: `src/pages/CreateProjectNew.tsx` (Lines 316-329)

**Before:**
```typescript
const payload = {
  from_org_id: currentOrg?.id,      // Creator (TC)
  from_role: creatorRole,           // "Trade Contractor"
  to_role: teamMember.role,         // "Field Crew"
  to_org_id: teamMember.org_id,     // Invitee (FC)
  // ...
};
```

**After:**
```typescript
// Determine direction based on who should invoice whom
// Worker (invoice sender) = from_org, Payer = to_org
const isCreatorUpstream = 
  (creatorRole === 'General Contractor') ||
  (creatorRole === 'Trade Contractor' && teamMember.role === 'Field Crew');

const payload = isCreatorUpstream ? {
  // Invitee is worker, creator is payer
  from_org_id: teamMember.org_id,
  from_role: teamMember.role,
  to_org_id: currentOrg?.id,
  to_role: creatorRole,
  // ...
} : {
  // Creator is worker, invitee is payer (e.g., TC inviting GC)
  from_org_id: currentOrg?.id,
  from_role: creatorRole,
  to_org_id: teamMember.org_id,
  to_role: teamMember.role,
  // ...
};
```

### File: `src/components/project/AddTeamMemberDialog.tsx` (Lines 316-328)

Apply the same direction logic when TC invites FC.

---

## Database Migration

```sql
-- Fix existing TC->FC contracts where direction is backwards
-- Main contracts (with trade like 'Framer', 'Electrician', etc.)
UPDATE project_contracts
SET 
  from_org_id = to_org_id,
  to_org_id = from_org_id,
  from_role = to_role,
  to_role = from_role
WHERE 
  from_role = 'Trade Contractor' 
  AND to_role = 'Field Crew'
  AND (trade IS NULL OR trade NOT IN ('Work Order', 'Work Order Labor'));

-- Update any SOV references if needed (they're linked by contract_id, so no change needed)
-- Update any invoice references if needed (they're linked by contract_id, so no change needed)
```

---

## Testing Checklist

1. Create a new project as TC, invite FC
2. Verify the contract is stored with FC as `from_org` and TC as `to_org`
3. Log in as FC, go to project, navigate to Invoices tab
4. Click "New Invoice" and verify the main contract appears in the dropdown
5. Create an invoice and verify it flows correctly through approval

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Existing invoices may be affected | Invoices reference `contract_id`, not org direction - no impact |
| RLS policies may break | RLS uses org membership, not direction - minimal impact |
| SOV visibility may change | SOVs are linked by `contract_id` - no impact |
| UI labels may be confusing | Verify dropdown labels still make sense after swap |

---

## Files Summary

| File | Change Type |
|------|-------------|
| `src/pages/CreateProjectNew.tsx` | Modify contract direction logic |
| `src/pages/EditProject.tsx` | Modify contract direction logic |
| `src/components/project/AddTeamMemberDialog.tsx` | Modify contract direction logic |
| `supabase/migrations/[timestamp]_fix_contract_direction.sql` | Data migration |
