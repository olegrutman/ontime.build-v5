
# Plan: Fix Notification Inviter Name for All Role Combinations

## Problem Summary
When one organization invites another to a project, the notification shows the **project owner's name** instead of the **actual inviter's organization name**. This is incorrect when:
- TC invites FC to a GC-owned project (shows GC name, should show TC name)
- TC invites Supplier to a GC-owned project (shows GC name, should show TC name)

## Solution

### Part 1: Update the Database Trigger

Fix the `notify_project_invite()` function to look up the actual inviter's organization:

```sql
CREATE OR REPLACE FUNCTION public.notify_project_invite()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project projects;
  _inviter_org organizations;
BEGIN
  -- Get project details
  SELECT * INTO _project FROM projects WHERE id = NEW.project_id;
  
  -- Get ACTUAL inviter's org name (from the user who invited, not project owner)
  SELECT o.* INTO _inviter_org 
  FROM user_org_roles uor
  JOIN organizations o ON o.id = uor.organization_id
  WHERE uor.user_id = NEW.invited_by
  LIMIT 1;
  
  -- Fallback to project owner if inviter org not found
  IF _inviter_org IS NULL THEN
    SELECT * INTO _inviter_org FROM organizations WHERE id = _project.organization_id;
  END IF;
  
  IF NEW.invite_status = 'INVITED' THEN
    INSERT INTO notifications (...) VALUES (..., _inviter_org.name || ' has invited...');
  ELSIF NEW.invite_status = 'ACCEPTED' THEN
    INSERT INTO notifications (...) VALUES (..., 'by ' || COALESCE(_inviter_org.name, 'the project owner'));
  END IF;
  
  RETURN NEW;
END;
$$;
```

### Part 2: Update the Dashboard Data Fetching

Fix `useDashboardData.ts` to fetch the actual inviter's organization:

1. Add `invited_by` to the query for pending invites
2. Separately fetch the inviter's organization via `user_org_roles`
3. Update the `invitedByOrgName` field to use the correct organization

### Part 3: Add Inviter Org ID to project_participants (Optional Enhancement)

For better performance and simpler queries, consider adding an `invited_by_org_id` column to `project_participants`:

```sql
ALTER TABLE project_participants ADD COLUMN invited_by_org_id uuid REFERENCES organizations(id);
```

Then update the application code to populate this when creating invites.

---

## Technical Details

### Files to Modify

1. **supabase/migrations/new_migration.sql** - Database trigger fix
2. **src/hooks/useDashboardData.ts** - Fix inviter org lookup for pending invites

### Database Changes
- Update `notify_project_invite()` function to use `NEW.invited_by` instead of `_project.organization_id`
- The trigger already has access to `NEW.invited_by` (the user ID), just needs to look up their org

### Expected Behavior After Fix

| Scenario | Before (Bug) | After (Fixed) |
|----------|--------------|---------------|
| GC invites TC | "GC has invited you" | "GC has invited you" (correct) |
| TC invites FC | "GC has invited you" (wrong) | "TC has invited you" (correct) |
| TC invites Supplier | "GC has invited you" (wrong) | "TC has invited you" (correct) |
| GC invites Supplier | "GC has invited you" | "GC has invited you" (correct) |

---

## Testing Plan

1. Log in as TC user
2. Create/open a GC-owned project where TC is a participant  
3. Invite an FC organization to the project
4. Log in as FC user
5. Check notifications - should show TC's org name, not GC's

