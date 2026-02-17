

# Hide Pricing Defaults for GC Users and Remove Invite from Profile

## Changes

### 1. Hide Pricing Defaults for GC users
The "Pricing Defaults" card (hourly rate, markup, crew size, etc.) is not relevant for General Contractors. It will be conditionally rendered -- only shown when the user's organization type is **not** GC.

### 2. Remove "Invite a Colleague" card
The invite functionality already exists on the Team page, so it is redundant here. The entire `InviteColleagueCard` component and its rendering block will be removed from the Profile page.

## Technical Details

| File | Change |
|------|--------|
| `src/pages/Profile.tsx` | Wrap the Pricing Defaults card in a condition: only render when `organization?.type !== 'GC'` |
| `src/pages/Profile.tsx` | Remove the `InviteColleagueCard` component definition (lines 38-94) and its usage (lines 620-627) |
| `src/pages/Profile.tsx` | Clean up unused imports (`UserPlus`, `useOrgTeam`) |

