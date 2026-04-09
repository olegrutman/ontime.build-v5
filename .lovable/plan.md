

# Coordinate FC Contract Card with Team Card — Auto-Invite on Save

## What I Understand

Right now the FC Contract card (Card 2) has a plain text "Field Crew" field. You want:
1. Replace the "Field Crew" text field with a **search input** (like the existing `AddTeamMemberDialog` search) so the TC can find an FC org from the directory
2. TC enters the **contract value** in the same card
3. When TC clicks **Save FC Contract**, if the selected FC isn't already on the team, the system **automatically creates the invite** (project_team + project_invites + contract record) — no separate dialog needed
4. The FC immediately appears in the **Team Card** (Card 9) with "Invited" status

## Plan

### 1. Add FC search state to `TCProjectOverview.tsx`
- Add state for `selectedFcOrg` (org_id, org_name, contact info) from search results
- Add inline search using the existing `search_existing_team_targets` RPC (same as AddTeamMemberDialog uses)
- Pre-populate with existing FC if one is already on the contract

### 2. Replace the "Field Crew" EditField with a search-enabled input
- When no FC is selected and no contract exists: show a search input with dropdown results
- When an FC is already assigned: show the name with an option to change
- Style it to match the card's existing design tokens (amber/navy palette)

### 3. Modify `saveFcContract` to auto-invite
When saving, if a new FC org was selected that isn't already in `project_team`:
- Insert into `project_team` (role: Field Crew, status: Invited)
- Insert into `project_invites`
- Create/update the `project_contracts` record with the selected FC org as `from_org_id` and the contract value
- Refresh the team list so Card 9 updates immediately

If the FC is already on the team, just update the contract value as before.

### 4. Keep Team Card (Card 9) in sync
- After save, call `fetchTeam()` to refresh the team list
- The FC will show with "Invited" badge and resend button

### Files Changed

| File | Change |
|------|--------|
| `src/components/project/TCProjectOverview.tsx` | Add FC org search in Card 2, auto-invite logic in `saveFcContract`, refresh team on save |

No database changes needed — all tables and RLS policies already exist.

