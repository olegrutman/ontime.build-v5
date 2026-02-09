

# Org Team Management -- Multi-User Support

## Overview

Add an "Organization Team" page accessible from the sidebar where admins (GC_PM, TC_PM, FC_PM) can invite colleagues to their organization, view current members, and manage pending invitations. Invited users see a banner on their dashboard to accept/decline org invitations.

## What Gets Built

### 1. "My Team" Sidebar Link

Add a "My Team" nav item under the existing Navigation group, visible only to users with `canManageOrg` permission (GC_PM, TC_PM, FC_PM). Links to `/org/team`.

### 2. Org Team Page (`/org/team`)

A page with two sections:

**Current Members** -- table/list showing:
- Name, email, role (from `user_org_roles` joined with `profiles`)
- Role badge (GC_PM, TC_PM, FS, etc.)
- No remove action for now (keep it simple)

**Invite New Member** -- a form with:
- Email input
- Role selector (dropdown filtered by `ALLOWED_ROLES_BY_ORG_TYPE` for the current org type)
- "Send Invite" button
- Inserts into `org_invitations` table (already has RLS for PM roles)

**Pending Invitations** -- list showing:
- Email, role, sent date, status
- Option to cancel/revoke a pending invite

### 3. Accept Org Invitation Flow

**Database function**: `accept_org_invitation(p_invitation_id UUID)` -- a `SECURITY DEFINER` function that:
1. Validates the invitation belongs to the calling user's email
2. Checks it's still `pending` and not expired
3. Inserts a `user_org_roles` row with the invited role
4. Updates invitation status to `accepted`

**Dashboard banner**: On the Dashboard page, query `org_invitations` where email matches the current user and status is `pending`. Show a card with "You've been invited to join [Org Name] as [Role]" with Accept/Decline buttons.

### 4. Decline Function

`decline_org_invitation(p_invitation_id UUID)` -- sets status to `expired`.

## Database Migration

```text
-- Accept org invitation (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.accept_org_invitation(p_invitation_id UUID)
RETURNS void ...
  1. Validate caller's email matches invitation email
  2. Check status = 'pending' and expires_at > now()
  3. INSERT INTO user_org_roles (user_id, organization_id, role)
  4. UPDATE org_invitations SET status = 'accepted'

-- Decline org invitation
CREATE OR REPLACE FUNCTION public.decline_org_invitation(p_invitation_id UUID)
RETURNS void ...
  1. Validate caller's email matches invitation email
  2. UPDATE org_invitations SET status = 'expired'
```

## File Changes

| File | Change |
|---|---|
| New migration | Create `accept_org_invitation` and `decline_org_invitation` functions |
| `src/pages/OrgTeam.tsx` (new) | Org team management page with members list, invite form, pending invitations |
| `src/hooks/useOrgTeam.ts` (new) | Hook to fetch org members, pending invites, send invite, cancel invite |
| `src/App.tsx` | Add route `/org/team` pointing to OrgTeam page |
| `src/components/layout/AppSidebar.tsx` | Add "My Team" nav link for users with `canManageOrg` |
| `src/components/dashboard/OrgInviteBanner.tsx` (new) | Banner component showing pending org invitations with Accept/Decline |
| `src/pages/Dashboard.tsx` | Render `OrgInviteBanner` at top of dashboard |

## Permission Model

- **Who can invite**: GC_PM, TC_PM, FC_PM (roles where `canManageOrg = true`)
- **Available roles to assign**: Filtered by org type using existing `ALLOWED_ROLES_BY_ORG_TYPE`
  - GC org can invite: GC_PM
  - TC org can invite: TC_PM, FS
  - FC org can invite: FC_PM, FS
- **Who can accept**: Any authenticated user whose email matches a pending invitation
- **RLS**: Already configured -- PMs can INSERT and SELECT on `org_invitations`
