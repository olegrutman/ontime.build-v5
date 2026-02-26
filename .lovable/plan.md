

# Role-Aware Onboarding Checklist

## Problem

The onboarding checklist currently shows "Create your first project" for all organization types, including Suppliers and Field Crews who never create projects. Additionally, for GC/TC users who join a project via invite rather than creating one, the label doesn't reflect that path.

## Changes

### 1. Update `OnboardingChecklist` to accept `orgType` (src/components/dashboard/OnboardingChecklist.tsx)

- Add `orgType` prop (string | null)
- For **Supplier** and **FC** org types: Remove the "Create your first project" step entirely. These roles only have 3 steps (profile, org details, team invite).
- For **GC** and **TC** org types: Change the label to "Create or join your first project" and keep the existing `projectCreated` logic (which already works -- accepted project invites show up in the projects list, so `projects.length > 0` covers both cases).

### 2. Pass `orgType` from Dashboard (src/pages/Dashboard.tsx)

- Pass the existing `orgType` variable to `OnboardingChecklist` as a prop. No new data fetching needed.

## Why This Works Without Backend Changes

- The `projectCreated` flag is based on `projects.length > 0`, which already includes projects the user joined via invite (they appear in `project_team`). No database changes needed.
- The org type is already available from `userOrgRoles[0]?.organization?.type`.

## Technical Details

### OnboardingChecklist.tsx changes:
- Add `orgType?: string | null` to the props interface
- Build the steps array conditionally:
  - Always include: profile, org details, team invite
  - Only for GC/TC: add "Create or join your first project"
- Progress calculation automatically adjusts since `steps.length` changes

### Dashboard.tsx changes:
- Add `orgType={orgType}` to the `<OnboardingChecklist>` component
