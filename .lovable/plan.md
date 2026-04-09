

# Use Existing Partner Search in Project Creation Team Section

## Problem
The BasicsStep team section currently uses plain text inputs to add members. The rest of the app uses `AddTeamMemberDialog` which has a **Search tab** (queries existing orgs via `search_existing_team_targets` RPC) and an **Invite tab** (manual entry). You want the same search-first experience during project creation.

## Approach
Replace the inline plain-text form in BasicsStep with the `AddTeamMemberDialog` component. Since the dialog currently requires a `projectId` (to check for duplicates and insert directly into `project_team`), we need to adapt it to also work in an **in-memory mode** — where selecting/inviting a member returns the data to the parent instead of saving to the database.

## Changes

### 1. `src/components/project/AddTeamMemberDialog.tsx`
- Add an optional `mode` prop: `'direct'` (default, current behavior — saves to DB) vs `'collect'` (returns member data via callback, no DB writes)
- Add optional `onCollect?: (member: TeamMember) => void` callback prop
- In `'collect'` mode, the "Add" / "Invite" buttons call `onCollect` with the assembled `TeamMember` object instead of inserting into `project_team` / `project_invites`
- Make `projectId` optional (only required in `'direct'` mode)
- The search RPC `search_existing_team_targets` can still work without a valid project ID — pass a dummy UUID or adjust the query param

### 2. `src/components/project-wizard-new/BasicsStep.tsx`
- Remove the plain-text add member form entirely
- Add an "Add Member" button that opens `AddTeamMemberDialog` in `'collect'` mode
- When `onCollect` fires, append the returned `TeamMember` to the in-memory `team` array
- Keep the existing member list display + remove button (unchanged)

### 3. `src/pages/CreateProjectNew.tsx`
- No changes needed — already passes `team` and `onTeamChange` to BasicsStep, and saves team members on final "Create Project" click

| File | Change |
|------|--------|
| `src/components/project/AddTeamMemberDialog.tsx` | Add `mode: 'direct' | 'collect'` prop + `onCollect` callback; skip DB writes in collect mode |
| `src/components/project-wizard-new/BasicsStep.tsx` | Replace plain-text form with `AddTeamMemberDialog` in collect mode |

