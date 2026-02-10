

# Add Role Change for Org Members

## Overview

Replace the static role badge on each member row with a role dropdown that admins can use to change a member's role. A SECURITY DEFINER database function handles the update server-side with proper authorization checks.

## Database Migration

A new `change_org_member_role` SECURITY DEFINER function that:
1. Verifies the caller is a PM in the same organization as the target member
2. Verifies the target role is valid for the organization type
3. Prevents users from changing their own role (safety guard)
4. Updates the `user_org_roles.role` column

No new RLS UPDATE policy is needed on `user_org_roles` since the function uses SECURITY DEFINER to bypass RLS.

```text
CREATE OR REPLACE FUNCTION public.change_org_member_role(
  p_member_role_id UUID,
  p_new_role TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_target_user_id UUID;
  v_org_type TEXT;
BEGIN
  -- Get target member info
  SELECT organization_id, user_id INTO v_org_id, v_target_user_id
  FROM user_org_roles WHERE id = p_member_role_id;

  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;

  -- Caller must be PM in same org
  IF NOT EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_id = auth.uid() AND organization_id = v_org_id
      AND role IN ('GC_PM','TC_PM','FC_PM')
  ) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Cannot change own role
  IF v_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  -- Validate role is allowed for org type
  SELECT type INTO v_org_type FROM organizations WHERE id = v_org_id;
  IF NOT (
    (v_org_type = 'GC' AND p_new_role IN ('GC_PM')) OR
    (v_org_type = 'TC' AND p_new_role IN ('TC_PM','FS')) OR
    (v_org_type = 'FC' AND p_new_role IN ('FC_PM','FS')) OR
    (v_org_type = 'SUPPLIER' AND p_new_role IN ('SUPPLIER'))
  ) THEN RAISE EXCEPTION 'Invalid role for org type'; END IF;

  -- Update
  UPDATE user_org_roles SET role = p_new_role::app_role
  WHERE id = p_member_role_id;
END;
$$;
```

## File Changes

| File | Change |
|---|---|
| New migration | Create `change_org_member_role` function |
| `src/hooks/useOrgTeam.ts` | Add `changeRole(memberRoleId, newRole)` function that calls the RPC |
| `src/pages/OrgTeam.tsx` | Replace static Badge with a Select dropdown for role. Disable for the current user's own row. Show Badge for orgs with only one allowed role (e.g., GC). |

## UI Behavior

- Each member row shows a role dropdown instead of a static badge
- The current user's own row keeps a static badge (cannot change own role)
- Organizations with only one possible role (GC has only GC_PM) show a static badge for all members since there is nothing to change
- On selection change, the RPC is called and the list refreshes
- Error/success feedback via existing toast system

