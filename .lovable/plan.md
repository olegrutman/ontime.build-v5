# Fix: Next button stays disabled after inviting TC/FC

## Root cause
`TeamStep`'s `AddTeamMemberDialog` completes and refreshes its own local list, but never notifies the parent. So `FinishProjectSetup`'s `refetchCtx()` never runs, `downstreamContracts` stays empty, and the Next button gate fails.

## Changes

### 1. `src/components/project-wizard-new/TeamStep.tsx`
- Add optional prop `onTeamChange?: () => void`.
- Call it after every successful add / remove / resend (right after `fetchTeamMembers()`).
- Leave the existing `onChange` prop untouched.

### 2. `src/pages/FinishProjectSetup.tsx`
- Pass `onTeamChange={() => { refetchTeam(); refetchCtx(); }}` to `TeamStep`.
- Broaden `hasInvitedDownstream` to also accept downstream `project_team` rows (role = "Trade Contractor" for GC, "Field Crew" for TC) as a fallback, so the gate enables even if the contract row briefly lags.
- On Next from `invite_team` → `contracts`: for any invited downstream member missing a `project_contracts` row, insert one with `contract_sum: 0`, correct `from_*`/`to_*` fields, as a safety net.

## Out of scope
- `AddTeamMemberDialog` internals
- Realtime / polling
- Any schema change
