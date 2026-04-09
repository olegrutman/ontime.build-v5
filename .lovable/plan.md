

# Fix: Invitation Flow Gaps

## Problems Found

### 1. TC_Test Missing from `project_participants`
The TC_Test member was added during project creation before the `org_id` fix was deployed. Result: `org_id` is null in `project_team`, the trigger `trg_sync_team_to_participants` never fired, no notification was created. The TC user cannot see or accept the invitation.

### 2. Resend Does Nothing Useful
`handleResend` in `GCProjectOverviewContent.tsx` only updates `project_invites.created_at`. It does not:
- Create a missing `project_participants` row
- Create a new notification
- The user being "resent" to will never know

### 3. Email-Only Invites Have No Participant Row
When inviting by email (new user, no `org_id`), no `project_participants` row is created since the trigger requires `org_id IS NOT NULL`. This is expected for truly new users, but if the invited email matches an existing user, the `org_id` should be resolved.

## Fix Plan

### File 1: `src/components/project/GCProjectOverviewContent.tsx`
Update `handleResend` to:
1. Look up the `project_team` row for `org_id`
2. If `org_id` exists but no `project_participants` row exists, insert one (with `invite_status = 'INVITED'` and mapped role)
3. If `org_id` is null, try to resolve it from `profiles` + `user_org_roles` using the `invited_email` from `project_invites`, and update `project_team.org_id` + create `project_participants`
4. Insert a new notification via `notifications` table for the invited user
5. Show a toast confirming resend

### File 2: `src/components/project/ProjectOverviewTeamCard.tsx`
Apply the same improved resend logic (this component is used by non-GC views).

### File 3: `src/components/project/ProjectTeamSection.tsx`
Apply the same improved resend logic to the sidebar team section.

### Role Mapping Helper
Create a small helper to map `project_team.role` strings to `project_participants.role` enum values:
- `'General Contractor'` → `'GC'`
- `'Trade Contractor'` → `'TC'`
- `'Field Crew'` → `'FC'`
- `'Supplier'` → `'SUPPLIER'`

## Technical Details

The core resend logic (shared across all 3 files):

```typescript
async function resendInvite(projectId: string, teamMemberId: string) {
  // 1. Get team member details
  const { data: tm } = await supabase.from('project_team')
    .select('org_id, role, invited_email, invited_org_name')
    .eq('id', teamMemberId).single();

  let orgId = tm.org_id;
  const roleMap = { 'General Contractor': 'GC', 'Trade Contractor': 'TC', 'Field Crew': 'FC', 'Supplier': 'SUPPLIER' };
  const participantRole = roleMap[tm.role];

  // 2. If no org_id, try to resolve from invited_email
  if (!orgId && tm.invited_email) {
    const { data: profile } = await supabase.from('profiles')
      .select('user_id').eq('email', tm.invited_email).maybeSingle();
    if (profile) {
      const { data: orgRole } = await supabase.from('user_org_roles')
        .select('organization_id').eq('user_id', profile.user_id).limit(1).maybeSingle();
      if (orgRole) {
        orgId = orgRole.organization_id;
        // Update project_team with resolved org_id
        await supabase.from('project_team')
          .update({ org_id: orgId, user_id: profile.user_id })
          .eq('id', teamMemberId);
      }
    }
  }

  // 3. Ensure project_participants row exists
  if (orgId) {
    const { data: existing } = await supabase.from('project_participants')
      .select('id').eq('project_id', projectId)
      .eq('organization_id', orgId).maybeSingle();
    if (!existing) {
      await supabase.from('project_participants').insert({
        project_id: projectId,
        organization_id: orgId,
        role: participantRole,
        invite_status: 'INVITED',
      });
    }
  }

  // 4. Refresh invite timestamp
  await supabase.from('project_invites')
    .update({ created_at: new Date().toISOString() })
    .eq('project_team_id', teamMemberId);

  // 5. Create notification for the invited user
  if (orgId) {
    const { data: orgMembers } = await supabase.from('user_org_roles')
      .select('user_id').eq('organization_id', orgId);
    const { data: project } = await supabase.from('projects')
      .select('name').eq('id', projectId).single();
    
    for (const m of orgMembers || []) {
      await supabase.from('notifications').insert({
        user_id: m.user_id,
        type: 'PROJECT_INVITE',
        title: 'New Project Invitation',
        body: `You have been invited to join project "${project?.name}"`,
        entity_type: 'project_participant',
        action_url: '/dashboard',
      });
    }
  }
}
```

| File | Change |
|------|--------|
| `src/lib/inviteUtils.ts` | New shared helper: `resendProjectInvite()` with org resolution + participant creation + notification |
| `src/components/project/GCProjectOverviewContent.tsx` | Use shared `resendProjectInvite()` in `handleResend`, add success/error toast |
| `src/components/project/ProjectOverviewTeamCard.tsx` | Use shared `resendProjectInvite()` in `handleResend` |
| `src/components/project/ProjectTeamSection.tsx` | Use shared `resendProjectInvite()` in `handleResendInvite` |

