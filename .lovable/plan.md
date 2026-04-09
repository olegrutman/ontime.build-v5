
# Fix: TC Still Not Receiving Project Notification

## What I found
The resend is still failing, but for a different reason than the last fix.

### Actual root cause
The resend flow in `src/lib/inviteUtils.ts` tries to recover the missing `org_id` like this:

1. Read `project_team.invited_email`
2. Query `profiles` by that email
3. Query `user_org_roles` for that user
4. Update `project_team`
5. Create `project_participants`
6. Insert notification

For the failing TC invite, the network trace shows:

```text
GET project_team -> invited_email = tc@test.com, org_id = null
GET profiles?email=eq.tc@test.com -> []
PATCH project_invites -> succeeds
```

That means the code never resolves the invited user/org, so:
- `org_id` stays null
- no `project_participants` row is created
- no notification is inserted
- resend only refreshes `project_invites.created_at`

## Why `profiles` lookup fails
This is caused by RLS on `profiles`.

Current policies only allow:
- viewing your own profile
- viewing profiles of users in the same organization

A GC user searching for `tc@test.com` in another org cannot read that profile directly from the client, even though the invited user exists.

So the earlier notification INSERT policy was not the main blocker.

## Evidence from current implementation
### `src/lib/inviteUtils.ts`
The utility depends on direct client reads to:
- `profiles`
- `user_org_roles`

That is fragile for cross-org invitation recovery.

### Database behavior
`project_participants` is the real source of invite visibility.
If no participant row exists, the TC has nothing to accept.

### Existing secure pattern already in project
You already have a `SECURITY DEFINER` RPC:
- `search_existing_team_targets(...)`

That confirms the right pattern here is:
- move cross-org invite resolution into a backend function
- do not try to resolve foreign users from the client

## Implementation plan

### 1. Add a secure backend function for resend/recovery
Create a new database function, for example:

```sql
public.resend_project_invite(_project_id uuid, _team_member_id uuid)
```

This function should:
- load the `project_team` row
- if `org_id` is null and `invited_email` exists:
  - find matching `profiles.user_id` by email
  - find the user’s `organization_id`
  - update `project_team.org_id` and `user_id`
- ensure a `project_participants` row exists for that org/project
- set `invite_status = 'INVITED'`
- set `invited_by = auth.uid()`
- refresh `project_invites.created_at`
- insert an org-level or user-level `PROJECT_INVITE` notification
- return structured result data (`resolved`, `participant_created`, `notification_created`, etc.)

Because it is `SECURITY DEFINER`, it can safely resolve cross-org users without exposing broad client read access.

### 2. Tighten notification creation path
Inside that function, create the notification in the backend instead of from the client.

That avoids:
- silent partial success
- multiple client round-trips
- dependency on client RLS visibility for recovery

Prefer setting:
- `recipient_org_id = resolved org`
- optionally `recipient_user_id = resolved user` when known

This fits the existing notification model and `get_my_notifications()` behavior.

### 3. Update `src/lib/inviteUtils.ts`
Refactor `resendProjectInvite()` so it no longer does the recovery logic client-side.

Instead it should:
- call the new RPC
- throw if RPC returns failure
- surface clear errors like:
  - “Invited email does not match a registered account yet”
  - “Could not resolve organization for invited user”

### 4. Update all resend entry points
Keep all current UI entry points, but make them use the RPC-backed helper:
- `src/components/project/GCProjectOverviewContent.tsx`
- `src/components/project/ProjectOverviewTeamCard.tsx`
- `src/components/project/ProjectTeamSection.tsx`

Also improve error toasts so they show the actual backend message instead of generic failure.

### 5. Handle the current TC case explicitly
For the existing broken row:
- once the RPC is in place, clicking Resend should backfill:
  - `project_team.org_id`
  - `project_team.user_id`
  - missing `project_participants`
  - missing notification

If the email truly has no matching account/profile, the RPC should return that explicitly instead of pretending resend succeeded.

## Technical details

### Files to change
| File | Change |
|------|--------|
| `supabase/migrations/...sql` | Add secure RPC `resend_project_invite(...)` with cross-org resolution + participant creation + notification insert |
| `src/lib/inviteUtils.ts` | Replace client-side recovery logic with RPC call |
| `src/components/project/GCProjectOverviewContent.tsx` | Keep resend button, surface real RPC errors |
| `src/components/project/ProjectOverviewTeamCard.tsx` | Keep resend button, use updated helper |
| `src/components/project/ProjectTeamSection.tsx` | Keep resend button, use updated helper |

### Important design note
Do not “fix” this by opening `profiles` SELECT to arbitrary authenticated users by email. That would weaken privacy/security. The correct fix is a scoped security-definer function for this specific invite workflow.

### Expected outcome
After this change:
- Resend will actually repair legacy broken invites
- TC users with existing accounts will get a visible project invite
- UI will stop reporting success when only the invite timestamp changed
- future invitation recovery will be reliable across org boundaries
