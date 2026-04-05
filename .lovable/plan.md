

# Post-Setup Completion: Show Status + Inline Team Add on Contracts Card

## Problem

1. When the 5-phase setup wizard completes, there's no clear "done" state — the wizard stays open.
2. If no other companies were added during initial project creation, the Contracts card shows "No team members found" with no way to add parties inline.
3. GC should be able to add TC; TC should be able to add both GC and FC — directly from the Contracts card.

## Changes

### 1. `SetupWizardShell.tsx` — Collapse wizard after completion

When all 5 phases are complete and user clicks "Complete Setup", collapse the wizard content and show a success summary state (green check, "Setup Complete" message, with an "Edit" button to re-expand). Pass a `completed` flag up via `onComplete`.

### 2. `ProjectSetupFlow.tsx` — Collapsed setup state

When `setupComplete` is true (or `scopeComplete` on load), render the Setup card in a collapsed state showing "Setup Complete" with a toggle to expand/edit. Auto-scroll to the Contracts card.

### 3. `PhaseContracts.tsx` — Add "Add Party" button when team is empty or to add more

When `filteredTeam.length === 0` (or even when it has members), show an "Add Party" button that opens the existing `AddTeamMemberDialog`. After a member is added, refetch the team list so the contract row appears immediately.

- Determine `creatorOrgType` from the existing `creatorOrg` query (already available as `creatorOrg.type`)
- Pass it to `AddTeamMemberDialog` so role filtering works correctly (GC sees TC options; TC sees GC + FC options)
- On `onMemberAdded`, invalidate `project_team_contracts` query to refresh the list

### Files Changed

| File | Change |
|------|--------|
| `PhaseContracts.tsx` | Import `AddTeamMemberDialog`; add state for dialog open; render "Add Party" button in both empty state and below the team list; pass `creatorOrgType` and refresh callback |
| `ProjectSetupFlow.tsx` | Add collapsed/expanded state for setup card; when `scopeComplete`, show summary with expand toggle; auto-focus contracts card |
| `SetupWizardShell.tsx` | Minor: ensure `onComplete` fires cleanly on final phase save |

### What is NOT Changing
- `AddTeamMemberDialog` — already handles role filtering per org type
- Database schema, RLS policies
- SOV card logic
- Initial project creation wizard

