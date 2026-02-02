

# Plan: Fix Supplier Auto-Selection by Adding RLS Policy

## Root Cause Analysis

The investigation revealed that the PO wizard correctly finds the supplier's organization from the project_team table, but the **RLS policy on the `suppliers` table** prevents the GC user from reading the supplier record.

### What's Happening

1. **Step 1 succeeds**: Query `project_team` with `role='Supplier'` returns org_id `12b5d7de-1bd1-431d-9601-93ba3d56870b`
2. **Step 2 fails**: Query `suppliers` with `organization_id IN (...)` returns **empty array** due to RLS

### Current RLS Policies on `suppliers` Table

| Policy Name | Command | Condition |
|-------------|---------|-----------|
| Org members can view suppliers | SELECT | `user_in_org(auth.uid(), organization_id)` |
| Supplier orgs can view own record | SELECT | User must be in supplier's org AND org type = 'SUPPLIER' |

The GC user (in GC_Test org) is **not** in the Supplier_Test organization, so neither policy allows the read.

---

## Solution

Add a new RLS policy that allows users to view suppliers whose organization is on a project team that the user also has access to.

### New RLS Policy

```sql
CREATE POLICY "Users can view suppliers on shared project teams"
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT pt.org_id 
      FROM project_team pt
      WHERE pt.org_id = suppliers.organization_id
        AND (
          -- User is a participant on the same project
          user_is_project_participant(auth.uid(), pt.project_id)
          OR 
          -- User created the project
          pt.project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
        )
    )
  );
```

This allows a GC user to see supplier records when:
- The supplier's organization is on a project team
- The user is a participant on that same project (or created the project)

---

## Implementation Steps

### 1. Add Database Migration

Create migration to add the new RLS policy on the `suppliers` table.

**SQL:**
```sql
-- Allow users to view suppliers that are on project teams they have access to
CREATE POLICY "Users can view suppliers on shared project teams"
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM project_team pt
      WHERE pt.org_id = suppliers.organization_id
        AND (
          user_is_project_participant(auth.uid(), pt.project_id)
          OR pt.project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
        )
    )
  );
```

---

## Technical Notes

### Database Schema Reference

**Tables involved:**
- `suppliers`: Has `organization_id` linking to `organizations` table
- `project_team`: Links projects to organizations via `org_id` and has `role` field
- `projects`: Has `created_by` for project ownership

**Existing helper function:**
- `user_is_project_participant(user_id, project_id)`: Checks if user is a participant on the project

### After Fix

When the PO wizard opens from Main Street Apartments:

1. Query `project_team` for suppliers returns org_id `12b5d7de-1bd1-431d-9601-93ba3d56870b`
2. Query `suppliers` now succeeds because the new policy allows viewing suppliers on shared project teams
3. Supplier "Supplier_Test" is auto-selected
4. User sees confirmation: "Project supplier auto-selected"

