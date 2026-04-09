

# Fix: Show Invited Members + Resend in GC Overview Team Card

## Problem
The GC project overview page uses `GCProjectOverviewContent.tsx`, which filters team members to only `status === 'Accepted'` (line 335). The `ProjectOverviewTeamCard` component we updated earlier is not used on this page. That's why invited members don't appear.

## Fix

### `src/components/project/GCProjectOverviewContent.tsx`

1. **Show all team members, not just accepted** — Replace `acceptedTeam` with `team` in the KPI card rendering (lines 525-538)
2. **Add visual distinction for invited members** — Show an "Invited" badge and dimmed text for non-accepted members
3. **Add resend button** — For invited members, show a resend icon button (same pattern as `ProjectOverviewTeamCard`)
4. **Update KPI header** — Change from `${acceptedTeam.length} Members` to show accepted/total ratio when there are pending invites
5. **Add resend state and handler** — Add `resending` state variable and `handleResend` function that updates `project_invites.created_at`

### Specific changes in the Team KPI card section (~lines 524-586):
- KPI value: `${acceptedTeam.length}/${team.length} Members` when there are pending invites
- Map over `team` (all members) instead of `acceptedTeam`
- For `status !== 'Accepted'`: dim the org name, append an "Invited" pill, show a resend button on hover
- Add `handleResend` function near existing handlers (same logic as `ProjectOverviewTeamCard`)

| File | Change |
|------|--------|
| `src/components/project/GCProjectOverviewContent.tsx` | Show all team members (not just accepted), add Invited badge + resend button for pending members |

