

# Merge Team Members into Project Basics Step

## What You Asked For
Move team invitations into the Project Basics step so users add their team up front (before building type / scope). Show the project owner's role (GC or TC) clearly so everyone knows who created the project. This removes the separate "Team" step — the wizard goes from 5 steps to 4.

## New Wizard Flow

```text
Step 1: Project Basics + Team (name, address, owner role badge, add team members)
Step 2: Building Type
Step 3: Scope & Contract
Step 4: Review (includes team summary)
```

## Changes

### 1. `src/components/project-wizard-new/BasicsStep.tsx`
- Add a "Project Owner" section at the top showing the current user's org name and role badge (e.g. "Acme Construction — General Contractor")
- Add an inline team section below the address fields with "Add Team Member" button
- Team members stored in-memory (no projectId needed yet) — each member is a `TeamMember` object with company name, contact, role, trade
- Props expanded to accept `team`, `onTeamChange`, `creatorOrgName`, `creatorRole`, and `creatorOrgType`

### 2. `src/pages/CreateProjectNew.tsx`
- Remove step 3 (Team) from `UNIFIED_STEPS` — now 4 steps: basics, building_type, scope, review
- Pass team state + creator info to `BasicsStepNew`
- Move `saveTeam` call to `createProject` (final save) since team members are in-memory until then
- Adjust step indices for building type (1), scope (2), review (3)

### 3. `src/components/project-wizard-new/UnifiedReviewStep.tsx`
- Add team member list to review summary so user can verify who they invited

### 4. `src/components/project-wizard-new/TeamStep.tsx`
- Keep file but no longer used in the wizard flow (may be useful elsewhere); or extract the inline member list into a reusable component used by BasicsStep

| File | Change |
|------|--------|
| `src/components/project-wizard-new/BasicsStep.tsx` | Add owner role display + inline team member list with add/remove |
| `src/pages/CreateProjectNew.tsx` | Remove Team step; pass team state to BasicsStep; 4-step flow |
| `src/components/project-wizard-new/UnifiedReviewStep.tsx` | Show team members in review |

