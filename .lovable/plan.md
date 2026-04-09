

# Add Resend Invitation to Project Overview Team Card

## Problem
The Team card on the Project Overview page only displays accepted members. Invited (pending) members are hidden, and there is no way to resend invitations from this view.

## Solution
Update `ProjectOverviewTeamCard` to show ALL team members (not just accepted), display an "Invited" badge for pending members, and add a resend button that appears on hover for invited members — matching the pattern already used in `TeamMembersCard`.

## Changes

### `src/components/project/ProjectOverviewTeamCard.tsx`
- Fetch `invited_email` alongside existing fields from `project_team`
- Show all team members (remove the `acceptedTeam` filter), update the subtitle count to reflect accepted vs total
- For members with `status === 'Invited'`, show a small "Invited" badge
- Add a resend button (RotateCw icon) that appears on hover for invited members
- Resend logic: update `project_invites.created_at` where `project_team_id = member.id` (same pattern as `TeamMembersCard`)
- Add `resending` state to track which member's invite is being resent
- Import `Badge`, `Loader2`, `RotateCw`, `Tooltip` components

| File | Change |
|------|--------|
| `src/components/project/ProjectOverviewTeamCard.tsx` | Show invited members with badge + resend button on hover |

