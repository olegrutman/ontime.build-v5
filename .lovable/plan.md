## Goal

When a GC sets up a project, the wizard must capture **both** contract legs with unambiguous labels and write **both** rows to `project_contracts`. Also make the "Define Scope & Details" banner reliably navigate.

## Why

Project `Oleg Rutman` shows the symptoms:
- One contract row exists: `Owner → GC`, `owner_contract_value=$1,500,000`, `contract_sum=0`. No `GC → TC` row, despite a TC participant being invited.
- The wizard only asks one ambiguous question — "What is the total contract value?" — and for GC creators silently routes it to `owner_contract_value`. The user thought they were entering the TC contract.
- Overview's "TC Contract" card therefore shows $0 with no indication of which TC the contract is with.
- Banner is a `<div onClick>`; click is not firing for the user.

## Changes

### 1. Wizard questions (`src/hooks/useSetupWizardV2.ts`)

Re-label and split S0 by creator role at render time (via the visibility filter), without changing the question schema for non-GC paths:

- For **GC** creators show two questions:
  - `S0_owner` — label: "Owner contract value — your revenue from the property owner" → fieldKey `contract_value`
  - `S0_gc_tc` — label: "Trade Contractor contract value — what you'll pay your TC" → fieldKey `gc_tc_contract_value`
- For **TC** creators show:
  - `S0` relabeled: "GC contract value — what the GC is paying you" → fieldKey `contract_value`
  - existing `fc_contract_value` question relabeled: "Field Crew contract value — what you'll pay your FC"
- For **FC** creators: existing S0 relabeled: "TC contract value — what the TC is paying you".

Labels are computed from `creatorOrgType` already available in `saveAll`; I'll thread it (or a `roleContext` prop) into the question list builder so `visibleQuestions` picks the right copy.

### 2. Persist the GC→TC leg (`_saveToDb`, GC branch)

After updating `owner_contract_value` on the existing Owner→GC row, also write a GC→TC contract when `gc_tc_contract_value > 0`:

```text
INSERT project_contracts
  from_role        = 'Trade Contractor'
  from_org_id      = <invited TC participant org_id, or null>
  to_role          = 'General Contractor'
  to_org_id        = <creator GC org>
  contract_sum     = gc_tc_contract_value
  material_responsibility = (inherit from Owner→GC row)
  status           = 'Active'
```

Lookup the TC org via `project_participants` (role=TC, latest). If none exists yet, still insert with `from_org_id=null` (placeholder), matching the existing TC→FC pattern used for unknown FC orgs.

Generate a downstream "GC → TC SOV" mirroring the TC→FC SOV logic already in place at lines 1273-1283 of `useSetupWizardV2.ts`.

### 3. Overview labeling (`ProjectHealthHero.tsx` / TC Contract card)

Ensure the TC Contract card subtitle reads `with <TC org name>` (resolved from the GC→TC row's `from_org_id`). Owner card shows `with <Owner name>` (already partially handled). Pure presentation change.

### 4. Banner navigation (`src/pages/ProjectHome.tsx` lines 398-414)

Replace the clickable `<div>` with a `<button type="button">`, add `relative z-10`, and use a fresh navigate call with the resolved id. This rules out pointer-events / overlay interception and the rare event-bubbling issue.

### 5. Verify

After edits, run the preview at `/project/f2d61694-16fe-464f-a2d7-c6df61b8e0ba/overview`, click the banner, confirm navigation to `/project/<id>/setup`. Then walk through the wizard as a GC: confirm two clearly-labeled contract fields appear; on save, query `project_contracts` to confirm both legs exist with the correct `contract_sum` values.

## Out of scope

- Re-flowing existing projects (`Oleg Rutman` already has its Owner row; user can enter the TC value via the Overview inline editor or by re-running setup once the wizard supports both fields).
- Changing GC↔TC SOV templates beyond mirroring the existing TC→FC structure.
- T&M / Remodel projects (wizard already skips contract creation in TM mode).
