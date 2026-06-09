# Finish Setup: party-aware contracts + TC invite gate

## Problem
Current "Your Contract" step shows one unlabeled "Total contract value" input. It doesn't say *which* contract or *between whom*, doesn't surface the locked supplier contract, and lets a GC enter a GC↔TC value before any TC exists on the project.

## Revised step order (GC adopting from supplier)

```
1. Building Info        (confirm structure)
2. Contract Mode        (Fixed / T&M)
3. Invite Team          ← NEW — invite TCs (or "self-perform")
4. Contracts            ← rebuilt — multi-party, party-labeled
5. Building Type        (scope generation)
6. Scope                (SOV)
7. Review
```

TC adopting uses the same order but step 3 invites FCs.

## Step 3 — Invite Team (new)

Reuses the existing project-invite UI (`InviteSearchInput` / partner directory). Behavior:
- GC view: shows list of TCs currently on the project, "Invite TC" button, and a "Self-perform — no TCs needed" checkbox.
- TC view: same but for FCs.
- "Next" disabled until **either** at least one downstream party exists **or** self-perform is checked.
- Invitations save immediately to `project_invites` / `project_participants` as today — no separate persistence.

## Step 4 — Contracts (rebuilt `ContractsStep`)

Three party-labeled sections, each with explicit "Party A → Party B" titles.

### a. Supplier → You  *(read-only, only if buyer is material-responsible)*
```
Supplier → You    ·    {supplierName}    ·    $X    ·    Locked (from accepted estimate)
```
Pulled from `project_contracts` where `from_role = 'Supplier'` and `to_role` = current org's role. Hidden entirely if material responsibility ≠ this buyer.

### b. Owner → GC  *(GC view, optional)*  /  GC → TC  *(TC view, required)*
- **GC**: card title `Owner → You (Prime contract)`, helper "Optional — your contract with the property owner. You can add this later."
- **TC**: card title `General Contractor → You`, helper "What is the GC paying you for this project?" (required).

### c. Downstream contracts  *(required if downstream parties were invited in step 3)*
Renders one row per invited downstream org pulled from `project_participants`:
- **GC view**: `You → {TC name}` — input "What you're paying this TC". One per TC.
- **TC view**: `You → {FC name}` — input "What you're paying this FC". One per FC.
If user selected "self-perform" in step 3, this section is hidden.

### Material Responsibility
Stays where it is (top of step 4). Drives whether section (a) shows.

## Data model touches

No schema changes. Writes go to existing `project_contracts` rows with explicit `from_role`/`to_role`/`from_org_id`/`to_org_id`:

| Contract | from_role | to_role | from_org | to_org |
|---|---|---|---|---|
| Owner → GC (optional) | `Owner` | `GC` | null | GC org |
| GC → TC (per TC) | `GC` | `TC` | GC org | TC org |
| TC → FC (per FC) | `TC` | `FC` | TC org | FC org |
| Supplier → buyer | (existing, untouched) | | | |

`useSetupWizardV2.saveAll` already creates the upstream contract row; extend it to:
- accept an optional `ownerContractValue` (GC mode) and write Owner→GC only when > 0,
- iterate `downstreamContracts: Array<{ org_id, role, amount }>` instead of a single `fc_contract_value`.

## Files touched

- `src/pages/FinishProjectSetup.tsx` — add `invite_team` step, fetch invited TCs/FCs, pass into `ContractsStep`, pass supplier contract context, extend `finish()` to write multi-row contracts.
- `src/components/project-wizard-new/ContractsStep.tsx` — accept new props (`supplierContract`, `downstreamParties`, `viewerRole`, `ownerContractValue`, `onOwnerContractChange`), render the three labeled sections, drop the generic unlabeled input.
- `src/hooks/useSetupWizardV2.ts` — extend `saveAll` to handle multiple downstream contracts + optional owner contract.
- New small component `src/components/project-wizard-new/InviteTeamStep.tsx` — wraps existing invite UI with the self-perform toggle and "at least one" gate.

## Out of scope
- Changing the regular (non-adoption) `CreateProjectNew` flow.
- Supplier invoicing changes.
- Editing the locked supplier contract.
- Schema/migration changes.
