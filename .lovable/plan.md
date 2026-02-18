

# Fix: Remove Team Member in Project Wizard

## Problem
The "Remove" (trash icon) button on the Team step of the project wizard fails silently because there are **no RLS DELETE policies** on the `project_team` and `project_invites` tables. The frontend code (`handleRemoveMember`) correctly attempts to delete these rows, but the database blocks the operation.

## Solution
Add DELETE policies to both tables so that project creators (and team participants with authority) can remove team members during project setup.

## Changes

### 1. Database Migration -- Add DELETE policies

**`project_invites` table:**
- Allow deletion by the user who sent the invite (`invited_by_user_id = auth.uid()`) or the project creator.

**`project_team` table:**
- Allow deletion by the project creator (`projects.created_by = auth.uid()`) or by a participant org member (same condition used for INSERT).

### 2. Also clean up related data
The existing `handleRemoveMember` in `TeamStep.tsx` already deletes `project_invites` first, then `project_team`. We should also cascade-delete the associated `project_contracts` row (if one was created when the team member was added). This requires:
- Adding a DELETE policy on `project_contracts` for project creators
- Updating `handleRemoveMember` to also delete the contract row tied to that team member's org

### Summary of SQL

```sql
-- Allow project creators and invite senders to delete invites
CREATE POLICY "Project creators can delete invites"
  ON public.project_invites FOR DELETE
  USING (
    invited_by_user_id = auth.uid()
    OR project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Allow project creators and org participants to delete team members
CREATE POLICY "Project creators can delete team members"
  ON public.project_team FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
    OR project_id IN (
      SELECT project_id FROM project_participants
      WHERE organization_id IN (
        SELECT organization_id FROM user_org_roles
        WHERE user_id = auth.uid()
      )
    )
  );
```

### 3. Frontend update (`TeamStep.tsx`)
- Update `handleRemoveMember` to also delete the `project_contracts` row associated with the removed member's `org_id` (if it exists), before deleting the team and invite rows.

