

# Make "Invite a Team Member" Optional in Onboarding

## What Changes

The onboarding checklist currently requires inviting a team member before it considers setup complete. This change makes it optional by adding a "I'm the sole member" option.

## Changes

### 1. Update OnboardingChecklist (src/components/dashboard/OnboardingChecklist.tsx)
- Change the "Invite a team member" step to "Invite a team member (optional)"
- Add a small "I'm a sole member" link/button next to it that marks it as done
- When clicked, save this preference to `user_settings` or local storage so it stays dismissed

### 2. Update Dashboard logic (src/pages/Dashboard.tsx)
- Change `teamInvited` logic: consider it done if either `userOrgRoles.length > 1` OR the user has opted out by marking themselves as sole member
- Store the "sole member" flag in the database (`org_settings` table) or use `localStorage` for simplicity

### 3. Recommended approach: Use `org_settings`
- Add a `sole_member` boolean column to `org_settings` via migration (or use localStorage if we want to keep it simple)
- When user clicks "I'm the sole member", set this flag and mark the step complete

## Simplest Implementation (localStorage)

To avoid a migration, use `localStorage`:
- Key: `ontime_sole_member_{orgId}` 
- When clicked, set to `"true"` and mark `teamInvited` as done
- This keeps the change to just 2 files with no database changes

## Technical Details

**OnboardingChecklist.tsx**: Add an `onMarkSoleMember` callback prop. Render a "I'm the sole member" button below the invite step when it's not done. Clicking it calls the callback.

**Dashboard.tsx**: 
- Read `localStorage.getItem(\`ontime_sole_member_\${orgId}\`)` 
- Pass `teamInvited = userOrgRoles.length > 1 || soleMemberFlag` 
- Pass `onMarkSoleMember` handler that sets localStorage and updates state

