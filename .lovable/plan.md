

# Fix: Team Member Removal Should Cascade & Trigger Readiness Update

## Problems Found

1. **Incomplete cleanup on remove**: `TeamMembersCard.handleRemoveMember` only deletes `project_invites` and `project_team`, but does NOT delete related `project_participants` or `project_contracts`. The wizard's `TeamStep` correctly deletes contracts — this card does not. So after removal, the readiness checklist still sees the old participant as "awaiting acceptance."

2. **No readiness recalculation**: After removing a member or resending an invite, the `ProjectReadinessCard` is not notified to recalculate. There is no callback from `TeamMembersCard` to trigger `readiness.recalculate()`.

3. **Resend invite only touches `created_at`**: This is fine mechanically, but there's no feedback to the readiness system either.

## Plan

### 1. Add `onTeamChanged` callback prop to `TeamMembersCard`

Add an optional `onTeamChanged?: () => void` prop. Call it after successful remove or resend operations so the parent can react.

### 2. Fix `handleRemoveMember` to cascade properly

Match the wizard's `TeamStep` logic — before deleting the team row:
- Delete `project_contracts` where `from_org_id` or `to_org_id` matches the member's org
- Delete `project_participants` where the org matches
- Delete `project_invites` for the team member
- Delete the `project_team` row
- Call `onTeamChanged()` + `fetchTeam()`

This requires fetching `org_id` in the team query (currently only fetches `id, role, invited_org_name, status`). Add `org_id` to the select and the `TeamMember` interface.

### 3. Wire `onTeamChanged` in `ProjectHome.tsx`

Pass `onTeamChanged={readiness.recalculate}` to both desktop and mobile `TeamMembersCard` instances so the readiness card updates immediately after a member is removed or invite is resent.

### Files to modify

| File | Change |
|------|--------|
| `src/components/project/TeamMembersCard.tsx` | Add `org_id` to query & interface, cascade delete contracts + participants, add `onTeamChanged` prop and call it |
| `src/pages/ProjectHome.tsx` | Pass `onTeamChanged={readiness.recalculate}` to `TeamMembersCard` |

No database changes needed.

