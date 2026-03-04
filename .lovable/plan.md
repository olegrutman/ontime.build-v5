

# Add "I'm part of the team" option to onboarding checklist

## Problem
When a new user joins an existing organization, they see the "Invite a team member" step as incomplete. They aren't a sole member — they joined as a team member. There's no way to mark this step done without inviting someone or lying about being a sole member.

## Solution
Add a second dismiss button: **"I'm part of the team"** next to "I'm a sole member". Both options use the same localStorage mechanism to mark the step complete.

## Changes

### 1. `src/components/dashboard/OnboardingChecklist.tsx`
- Add `onMarkPartOfTeam` callback prop
- Render a second button "I'm part of the team" next to "I'm a sole member" when the step is incomplete

### 2. `src/pages/Dashboard.tsx`
- Add a `handleMarkPartOfTeam` handler that does the same thing as `handleMarkSoleMember` (sets the localStorage flag to true)
- Pass it as `onMarkPartOfTeam` to the checklist

Both buttons set the same `ontime_sole_member_{orgId}` localStorage flag — the flag just means "team step dismissed." This keeps logic simple and avoids needing a second storage key.

