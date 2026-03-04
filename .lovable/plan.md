

# Auto-detect "joined via invitation" for onboarding checklist

## Problem
When a user joins an existing organization (via search/invitation), they aren't the admin — they joined someone else's team. The onboarding checklist still shows "Invite a team member" as incomplete because `teamInvited` only checks `userOrgRoles.length > 1` (multiple members loaded) or the localStorage `soleMember` flag.

## Solution
A non-admin user (`is_admin === false`) definitionally joined an existing team. They should never see the "Invite a team member" step as incomplete.

## Change

### `src/pages/Dashboard.tsx` — line 191

Current:
```typescript
const teamInvited = (userOrgRoles.length > 1) || soleMember;
```

Updated:
```typescript
const isOrgAdmin = userOrgRoles[0]?.is_admin ?? false;
const teamInvited = !isOrgAdmin || (userOrgRoles.length > 1) || soleMember;
```

If the user is not the org admin, the team step is automatically satisfied — they are part of someone else's team. The "I'm a sole member" / "I'm part of the team" buttons only matter for admins (org creators) who haven't invited anyone yet.

