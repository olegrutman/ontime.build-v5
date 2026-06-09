# Fix: Contracts step ignores invited TC/FC

## Root cause

- `AddTeamMemberDialog` writes to `project_contracts` but doesn't error-check the response, so failures land silently. DB confirms zero `project_contracts` rows for this project even though the TC sits in `project_team` as Invited.
- `FinishProjectSetup`'s `downstreamContracts` is derived **only** from `project_contracts` rows, so the Contracts step shows "No trade contractors invited yet" whenever those rows are missing.
- The safety-net insert I added in the previous turn fires on Next, but: (a) it uses `status: 'Pending'` which is not a known status enum value, (b) it inserts without error logging, so it can fail and we'd never see why.

## Fix strategy

Make the **invited team list** the source of truth for the Contracts step. Contract rows get written on Finish, not on invite.

### 1. `src/pages/FinishProjectSetup.tsx`
- Replace the existing `downstreamContracts` memo so it iterates `teamData` filtered by `downstreamRoleLabel` (Trade Contractor for GC, Field Crew for TC). For each member, merge in the matching `project_contracts` row (if one exists) to pick up an existing `contract_sum`. The row key becomes the **team_member id** (not the contract id).
- `DownstreamContractRow` keeps the same shape; `id` now holds the team member id. `downstreamEdits` is keyed by team member id.
- `hasInvitedDownstream` becomes simply `downstreamContracts.length > 0`. Drop the separate `hasDownstreamTeamMember` fallback (the rewrite makes them equivalent).
- Delete `ensureDownstreamContractRows` and the async `nextStep`. Go back to synchronous `nextStep`.
- In `finish()`, after building the upserts loop, for each downstream member with an entered sum:
  - If there's an existing contract row → `update` it.
  - Else → `insert` a new one with `from_org_id = member.org_id`, `from_role = member.role`, `to_org_id = currentOrgId`, `to_role = creatorRoleLabel`, `to_project_team_id = member.id`, `contract_sum`, and **omit `status`** (let the column default handle it). Use `.select().single()` so failures throw and surface in the toast.
- Adjust the contracts gate so a `0` sum is allowed when the member is Invited (no point demanding a final number before the partner accepts). Keep the requirement that GC entered owner contract OR at least one downstream value > 0, so the Review step has something meaningful. (Open: confirm with user — see Question below.)

### 2. `src/components/project/AddTeamMemberDialog.tsx` (defensive)
- Both `project_contracts` inserts (search-existing and invite-by-email paths) gain `.select().single()` + an explicit `if (error) throw error` so silent failures stop being possible.
- No behavior change when the insert succeeds.

### 3. Cleanup
- Remove the stale `onChange` no-op from the previous turn; keep `onTeamChange` wiring as-is.

## Out of scope
- Schema changes
- Editing other wizards or the regular Create Project flow
- Owner contract behavior (already works)

## Question for the user (one)
Should the Contracts-step gate require a value > 0 for each invited downstream TC, or allow $0 / "to be negotiated" so the GC can finish setup before the TC accepts? Default in this plan: require > 0 only when the TC is Accepted, allow 0 for Invited.
