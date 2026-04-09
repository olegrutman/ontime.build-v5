

# Fix Contracts as Primary Database Records + Correct Contract Direction

## I Understand

1. **Contracts entered in the wizard must be THE main project contracts** — not just wizard answer values stored in memory. They must be persisted to `project_contracts` as the authoritative records with correct roles, org IDs, and material responsibility.

2. **Contract direction is currently wrong for TC downstream contracts.** Per the system's `validate_contract_direction` trigger, `from_org_id` = contractor (who bills), `to_org_id` = client (who pays). The TC→FC contract currently sets TC as `from` — but FC is the one billing TC, so FC should be `from` and TC should be `to`.

3. **Material responsibility from the wizard must be saved on the contract record** — it already writes `material_responsibility` but needs to be the single source of truth, not duplicated.

4. **Archive old ContractsStep** — replace with a proper contract entry component.

## Bugs Found

### Bug A: Contract direction wrong for TC downstream
- **Current:** Both contracts use `from_role = 'Trade Contractor'`, `from_org_id = TC's org`
- **Upstream (GC→TC):** TC bills GC → `from_role='Trade Contractor'`, `to_role='General Contractor'` ✓ correct
- **Downstream (TC→FC):** FC bills TC → should be `from_role='Field Crew'`, `to_role='Trade Contractor'`, `from_org_id=null` (FC not yet known), `to_org_id=TC's org`
- **Current code has it backwards** — will fail the `validate_contract_direction` trigger

### Bug B: `created_by_user_id` not set on contracts
- The `_saveContractAndSov` function never sets `created_by_user_id`, leaving it null

### Bug C: Upstream contract `to_org_id` should be null (GC not yet assigned), not hardcoded
- Currently `to_org_id: null` which is correct, but `to_role` for TC upstream should remain 'General Contractor' ✓

## Changes

### 1. `src/hooks/useSetupWizardV2.ts` — Fix contract save logic

- **Fix contract direction for TC downstream:** Change FC contract to `from_role='Field Crew'`, `to_role='Trade Contractor'`, `to_org_id=creatorOrgId` (TC is the payer)
- **Add `created_by_user_id`** parameter to `_saveContractAndSov` and `saveAll`
- **Pass user ID** from `CreateProjectNew.tsx` through to `saveAll`
- Update `saveAll` signature: `saveAll(pid, creatorOrgId, creatorOrgType, userId)`

### 2. `src/pages/CreateProjectNew.tsx` — Pass user ID to saveAll

- Change `wizard.saveAll(pid, currentOrg.id, currentOrg.type)` to include `user.id`

### 3. `src/components/project-wizard-new/ContractsStep.tsx` — Rename to proper contract page

- No structural changes needed — it already works as the main contract entry UI
- Add a note/badge indicating these become the official project contracts
- Keep material responsibility question prominent

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Fix FC contract direction (from=FC, to=TC); add `created_by_user_id` to contract inserts |
| `src/pages/CreateProjectNew.tsx` | Pass `user.id` to `wizard.saveAll()` |
| `src/components/project-wizard-new/ContractsStep.tsx` | Minor: add "Primary Contract" badge to clarify these are the real records |

