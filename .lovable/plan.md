

# Add "Invite to My Company" on Profile Page

## What This Does

Adds a compact "Invite a Colleague" card to the Profile page, right after the Organization Information section. Users can enter an email and select a role to invite someone to their organization -- without needing to navigate to the separate My Team page.

## UI Design

A new card between the Organization section and the Pricing Defaults section containing:
- Email input + role dropdown + "Send Invite" button (single row on desktop)
- Role options filtered by org type (using existing `ALLOWED_ROLES_BY_ORG_TYPE`)
- Only visible to users with `canManageOrg` permission
- Uses the existing `sendInvite` function from `useOrgTeam` hook
- Success/error feedback via existing toast system

## File Changes

| File | Change |
|---|---|
| `src/pages/Profile.tsx` | Import `useOrgTeam` and permission constants. Add an "Invite a Colleague" card after the Organization card (after line 558). Card contains email input, role select, and send button. Only rendered when `permissions?.canManageOrg` is true. |

## Technical Details

- Reuses `useOrgTeam().sendInvite` -- no new hooks or database changes needed
- Role options come from `ALLOWED_ROLES_BY_ORG_TYPE[orgType]`
- Email is trimmed and lowercased before sending (already handled in `sendInvite`)
- The card includes local state for email and role, resets on successful send
- No database migration required -- everything uses existing tables and RLS policies

