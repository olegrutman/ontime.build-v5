

# Add Remove & Resend Invite for Team Members

## Current State

- `TeamMembersCard` displays members grouped by role but with no per-member actions (no remove, no resend)
- RLS DELETE policies already exist for `project_team`, `project_invites`, and `project_contracts`
- Members currently rendered grouped: all members of a role on one line, making per-member actions impossible

## Changes Required

### 1. Refactor `TeamMembersCard` to render individual members (not grouped)

Currently members are grouped by role and joined with commas. Need to render each member as its own row so we can show action buttons per member. Each row gets:
- Role dot + abbreviation
- Org name
- Status badge (Invited / Accepted / Declined)
- **Hover actions**: Resend Invite (if status = Invited), Remove (with confirmation)

### 2. Add Remove functionality

- On remove click, show an AlertDialog confirmation: "Remove [org name] from this project?"
- On confirm:
  1. Delete from `project_invites` (where `project_team_id = member.id`)
  2. Delete from `project_contracts` (where `from_org_id` or `to_org_id` matches the member's org)
  3. Delete from `project_participants` (where matches)
  4. Delete from `project_team` (the member row)
  5. Refresh the team list
- Permission: only project creator or members from the inviting org can remove

### 3. Add Resend Invite functionality

- Show "Resend" button on members with status = `Invited`
- On click: update `project_invites.updated_at` to now (triggers notification re-send) and show a toast confirmation
- Since we don't have email sending for invites, this will update the invite record's timestamp and show a success toast. If a notification trigger exists, it will re-fire.

### 4. Files to modify

| Action | File |
|--------|------|
| Edit | `src/components/project/TeamMembersCard.tsx` — refactor to per-member rows, add remove/resend buttons + AlertDialog |

No database changes needed — existing RLS policies already support DELETE on the relevant tables.

