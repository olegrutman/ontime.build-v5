

# Fix: Require Contract Value When Inviting FC + Enforce One FC/TC Per Project

## Changes

### 1. Require contract value before saving FC contract
In `saveFcContract`, add validation that `newVal > 0`. If the contract value is 0 or empty, show an error toast and block the save (which also blocks the invite).

### 2. Block adding a second FC to the project
In the FC search section, if an FC is already on the team (any `team` member with `role === 'Field Crew'`), disable the search input and show the existing FC name instead. The save button should also check this.

### 3. Block adding a second TC via the Team Card invite
In the `AddTeamMemberDialog` usage on the Team Card, filter out TC/FC role options if one already exists on the team. Or simpler: after a successful search result selection, check if a member with that role already exists and show an error.

### File Changes

| File | Change |
|------|--------|
| `src/components/project/TCProjectOverview.tsx` | Add `newVal > 0` validation in `saveFcContract`; disable FC search if FC already on team; limit to one FC per project |

