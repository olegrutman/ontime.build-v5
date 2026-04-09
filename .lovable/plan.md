

# Fix: Project Team Invitations Not Working

## Problem
When team members are added during project creation, their invitations are incomplete:

1. **`project_team` insert is missing `org_id` and `user_id`** — The wizard's `CreateProjectNew.tsx` (lines 149-165) inserts team members into `project_team` without `org_id` or `user_id`, even though the `TeamMember` type carries `orgId` and `userId` from the search/selection step.

2. **Database trigger requires `org_id`** — The trigger `trg_sync_team_to_participants` only fires when `NEW.org_id IS NOT NULL`. Since `org_id` is null, no `project_participants` row is created and no notification is sent.

3. **Result**: The TC_Test invitation exists in `project_team` and `project_invites` but NOT in `project_participants`. The invited user never sees the invite on their dashboard, and no notification is created.

The Supplier invite worked because it was added later via `AddTeamMemberDialog`, which passes `org_id` correctly.

## Fix

### `src/pages/CreateProjectNew.tsx` — lines 149-165
Pass `org_id` and `user_id` from the `TeamMember` object when inserting into `project_team`:

```typescript
const { data: teamMember, error: teamErr } = await supabase
  .from('project_team')
  .insert({
    project_id: pid,
    org_id: member.orgId || null,       // NEW
    user_id: member.userId || null,     // NEW
    role: member.role,
    trade: member.trade,
    trade_custom: member.tradeCustom,
    invited_email: member.contactEmail,
    invited_name: member.contactName,
    invited_org_name: member.companyName,
    invited_by_user_id: user.id,
    status: 'Invited',
  })
```

This single change ensures:
- The database trigger `trg_sync_team_to_participants` fires (since `org_id` is not null)
- A `project_participants` row is created with `invite_status = 'INVITED'`
- The `trg_notify_project_invite` trigger then fires on `project_participants`, creating the notification
- The invited user sees the invite on their dashboard and can accept/decline

| File | Change |
|------|--------|
| `src/pages/CreateProjectNew.tsx` | Add `org_id` and `user_id` to team member insert |

