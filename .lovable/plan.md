

# Fix: TC to FC Invitation Notifications

## Problem Summary

When a Trade Contractor (TC) invites a Field Crew (FC) to a project, the FC doesn't receive the notification and doesn't see the invitation in their dashboard.

## Root Cause Analysis

There are two separate invitation tracking systems that aren't properly synchronized:

| System | Purpose | Notification | RLS Issue |
|--------|---------|--------------|-----------|
| `project_invites` | Email invites for new users | None | N/A |
| `project_participants` | Org-level project access | Yes (trigger) | Only project owner can INSERT |

**Current Flow (TC inviting FC):**
1. TC adds FC via "Search Existing" in AddTeamMemberDialog
2. Code inserts into `project_team` - succeeds
3. Code tries to insert into `project_participants` - **fails silently**
4. RLS policy rejects because TC is not the project owner (GC is)
5. Since insert fails, notification trigger never fires
6. FC never sees the invitation

## Solution

### Option A (Recommended): Add a database trigger on `project_team` to sync to `project_participants`

Create a trigger that automatically creates/updates `project_participants` when `project_team` records are created with status='Invited'. This ensures the notification system always works regardless of RLS policies.

### Option B: Fix the RLS policy on `project_participants`

Expand the INSERT policy to allow any accepted project participant to invite new participants, not just the project owner.

---

## Technical Implementation (Option A)

### 1. Create Database Trigger Function

Create a new function `sync_project_team_to_participants` that:
- Fires AFTER INSERT on `project_team`
- When `status = 'Invited'` and `org_id IS NOT NULL`
- Creates/updates a `project_participants` record with `invite_status = 'INVITED'`
- Uses `SECURITY DEFINER` to bypass RLS

```sql
CREATE OR REPLACE FUNCTION public.sync_project_team_to_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only sync when we have an org_id and status is Invited
  IF NEW.org_id IS NOT NULL AND NEW.status = 'Invited' THEN
    -- Map role string to org_type enum
    DECLARE
      _role_type text;
    BEGIN
      _role_type := CASE NEW.role
        WHEN 'General Contractor' THEN 'GC'
        WHEN 'Trade Contractor' THEN 'TC'
        WHEN 'Field Crew' THEN 'FC'
        WHEN 'Supplier' THEN 'SUPPLIER'
        ELSE 'TC'
      END;
      
      -- Upsert into project_participants
      INSERT INTO project_participants (
        project_id,
        organization_id,
        role,
        invite_status,
        invited_by
      ) VALUES (
        NEW.project_id,
        NEW.org_id,
        _role_type::org_type,
        'INVITED',
        NEW.invited_by_user_id
      )
      ON CONFLICT (project_id, organization_id) 
      DO UPDATE SET
        invite_status = 'INVITED',
        invited_by = NEW.invited_by_user_id,
        accepted_at = NULL
      WHERE project_participants.invite_status != 'ACCEPTED';
    END;
  END IF;
  
  RETURN NEW;
END;
$$;
```

### 2. Create the Trigger

```sql
CREATE TRIGGER trg_sync_team_to_participants
  AFTER INSERT ON public.project_team
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_team_to_participants();
```

### 3. Clean Up Frontend Code

Remove the redundant `project_participants` insert from `AddTeamMemberDialog.tsx` since the trigger now handles it:

**File: `src/components/project/AddTeamMemberDialog.tsx`**

Remove lines 296-314 (the `project_participants.upsert` call and its error handling) from `handleAddExisting()`.

---

## Additional Fixes Needed

### Fix "Invite by Email" Flow

The "Invite by Email" path also needs to create a notification when the invited user signs up. This requires:

1. During signup, check if there's a `project_invites` record matching the email
2. Link it to the new user's organization
3. Create the `project_participants` record
4. This triggers the existing notification

**OR** create a separate trigger on `project_invites` that sends a different type of notification (email-based invite pending).

---

## Files to Modify

| File/Resource | Change |
|--------------|--------|
| Database migration | Add `sync_project_team_to_participants` function and trigger |
| `src/components/project/AddTeamMemberDialog.tsx` | Remove redundant `project_participants` insert (optional cleanup) |

---

## Testing Plan

After implementation:
1. Log in as TC user who is already accepted on a project
2. Navigate to project Team tab
3. Click "Add Team Member" and search for an existing FC organization
4. Add the FC to the project
5. Log out and log in as the FC user
6. Verify: FC should see a notification bell with unread count
7. Verify: FC should see the project invitation in dashboard Pending Invites panel
8. Verify: FC can accept and the project appears in their project list

