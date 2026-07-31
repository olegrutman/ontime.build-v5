## Goal

When creating a project, the creator must define both sides of their contract chain before continuing:

- **TC creator:** must name the GC (pick an existing org or invite by email), and must either invite at least one Field Crew or toggle "We self-perform this work."
- **GC creator:** must name at least one Trade Contractor / Field Crew, or toggle "We self-perform this work."
- Supplier and FC creators: unchanged.

## Changes

### 1. New "Project Team" step in the creation wizard
Today team members are collected as an optional card at the bottom of the Basics step. Promote it to its own required step between Basics and the mode/contract steps, so it can be validated.

- Add a `team` step to the step lists in `src/pages/CreateProjectNew.tsx` (fixed, T&M, and supplier flows — supplier keeps it optional).
- Remove the team card from `BasicsStep.tsx` and move it into a new `src/components/project-wizard-new/ProjectPartiesStep.tsx`.

### 2. ProjectPartiesStep layout
Two labelled zones, driven by the creator's org type resolved from the database:

```text
UPSTREAM (who you bill)
  TC creator  -> General Contractor   [required]
  GC creator  -> (owner/none: zone hidden)

DOWNSTREAM (who bills you)
  TC creator  -> Field Crew           [required or self-perform]
  GC creator  -> Trade Contractor / Field Crew [required or self-perform]
```

Each zone has:
- A list of already-added parties with company, contact, trade, and an "Invited by email" vs "Existing org" chip.
- An "Add" button opening the existing `AddTeamMemberDialog` in `collect` mode, pre-filtered to the roles valid for that zone.
- The downstream zone has an "We self-perform this work — no crews to invite" switch (`ElongatedSwitch`), which disables and clears the downstream list.

The dialog already supports both search-existing and invite-by-email, and already filters roles by creator org type, so no new invite plumbing is needed — the step just constrains and validates it.

### 3. Validation
In `canProceed()` add a `team` case:
- TC: at least one team entry with role `General Contractor`, **and** (`selfPerform` true or at least one `Field Crew` entry).
- GC: `selfPerform` true or at least one `Trade Contractor`/`Field Crew` entry.
- Supplier / FC: always true.

Inline helper text explains what's missing rather than only greying out Next.

### 4. Persist the self-performed flag
`project_team.is_self_performing` already exists and is already read by `useProjectFinancials` and `TeamMembersCard`. On create, set `is_self_performing: selfPerform` on the creator's own `project_team` row in `createProject()`. No migration needed.

### 5. Draft persistence
Add `selfPerform` to the sessionStorage draft payload so a reload keeps the choice.

## Technical notes

- Roles come from `creatorOrgType` (`organizations.type` via `userOrgRoles[0]`), consistent with the existing `useOrgType` rule — no string inference.
- The email-invite path already creates `project_team` + `project_invites` rows in `createProject()`; a GC invited by a TC gets a normal pending project invite and joins on signup.
- No RLS or contract-direction logic changes; contract rows continue to be created by the existing wizard `saveAll` / invite flow.
