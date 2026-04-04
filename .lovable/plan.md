

# Fix: TC Can't Invite FC to a Project

## The Problem

The TC has no way to add an FC (or any team member) to a project they're participating in. The `ProjectOverviewTeamCard` shown on the overview is read-only with no "Add Member" button. The two components that DO have invite functionality (`TeamMembersCard` and `ProjectTeamSection`) are orphaned — defined but never rendered anywhere in the app.

## The Fix

Add an "Add Member" button to the `ProjectOverviewTeamCard` that opens the existing `AddTeamMemberDialog`. The button should only appear for GC and TC users (FC and Supplier cannot invite).

### Changes

**`src/components/project/ProjectOverviewTeamCard.tsx`**

1. Import `AddTeamMemberDialog`, `useAuth`, `Button`, `UserPlus`
2. Determine the viewer's org type from `userOrgRoles` (not the project creator's org type — the role filter logic in `AddTeamMemberDialog` already handles which roles each org type can invite)
3. Show an "Add Member" button in the card header for GC and TC users
4. Wire the button to open `AddTeamMemberDialog` with the correct `creatorOrgType` (the viewer's org type, since that controls available invite roles)
5. Refresh team data after a successful invite

### RLS

The INSERT policies on `project_team`, `project_invites`, `project_contracts`, and `project_activity` already allow inserts for users whose org is in `project_participants` — no database changes needed.

### What is NOT changing
- `AddTeamMemberDialog` logic (already correctly filters roles per org type)
- RLS policies
- Any other components or pages

