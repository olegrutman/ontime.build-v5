# Skip contract-value step for Suppliers; let estimates become the contract

## Problem
The Create-Project wizard currently asks every org — including SUPPLIER — for a "Contract Value" on the Contracts step. For a supplier this is meaningless because:
- A supplier doesn't have one upstream counterparty at setup time. They will eventually sell materials to whichever party is "material responsible" (GC or TC), and there can be more than one buyer over the life of the project.
- The real contract value between a supplier and a material-responsible party is the **accepted estimate total**, not a number guessed at project creation.
- Forcing a number creates a fake `project_contracts` row with the supplier as a party, which then pollutes financial KPIs, SOV billed totals, and margin math.

## Fix

### 1. Wizard flow — drop Contracts step for SUPPLIER
**`src/pages/CreateProjectNew.tsx`**
- Compute `isSupplier = creatorOrgType === 'SUPPLIER'`.
- Build the step list by filtering `'contracts'` out of `FIXED_STEPS` (and the T&M list if applicable) when `isSupplier`. So a supplier sees: Basics → Mode → Building Type → Scope → Review (no Contracts).
- In `canProceed()` the `'contracts'` case becomes unreachable for suppliers; no change needed beyond the filter.
- In `createProject()` pass a flag/skip into `wizard.saveAll(...)` so the contract/SOV block does not run for suppliers.

### 2. Wizard save — no contracts/SOV for SUPPLIER
**`src/hooks/useSetupWizardV2.ts`** — inside `_saveToDb`:
- Add an `isSupplier = creatorOrgType === 'SUPPLIER'` branch.
- Still save `project_setup_answers`, `project_scope_details`, and `projects.project_type` (the scope info is real and useful).
- **Skip** the `_saveContractAndSov(...)` calls entirely for suppliers — no `project_contracts` row, no SOV, no upstream/downstream placeholders.
- Don't persist `contract_value` / `fc_contract_value` answers for suppliers (filter them out of `answerRows`) so nothing downstream picks up a phantom value.

### 3. ContractsStep — defensive guard
**`src/components/project-wizard-new/ContractsStep.tsx`**
- Add an early return at the top: if `creatorOrgType === 'SUPPLIER'`, render nothing (in case the step is ever reached via a stale draft / deep-link). This keeps the component safe even though step 1 already removes it from the flow.

### 4. Review step — hide contract summary for SUPPLIER
**`src/components/project-wizard-new/ReviewStep.tsx`** and **`UnifiedReviewStep.tsx`**
- When `creatorOrgType === 'SUPPLIER'`, suppress the "Contract Value" summary card and instead show a small info note: *"Contracts are created automatically when you send an estimate to the GC/TC handling materials. The accepted estimate total becomes the contract value."*

### 5. Draft persistence
**`CreateProjectNew.tsx`** sessionStorage rehydration — if `creatorOrgType === 'SUPPLIER'` and the saved `currentStep` points at the (now-removed) Contracts step index, clamp it to the next valid step. Prevents a stuck wizard for users with an in-progress draft.

### 6. (Future, not in this change) Estimate → Contract bridge
The supplier estimate acceptance flow already produces an estimate total per project per buyer org. The natural follow-up is to have estimate-acceptance create/update a `project_contracts` row with:
- `from_role = 'Supplier'`, `from_org_id = supplier org`
- `to_role` / `to_org_id` = the material-responsible party that accepted (GC or TC)
- `contract_sum = accepted estimate total`

I'm **not** wiring that here — it's a separate change and depends on the estimate-acceptance UX. This plan just stops asking the wrong question; the estimate→contract creation can be its own follow-up so we don't conflate two flows.

## Files touched
- `src/pages/CreateProjectNew.tsx` — filter steps, pass supplier flag, draft clamp.
- `src/hooks/useSetupWizardV2.ts` — skip contract/SOV + drop contract_value answers for SUPPLIER.
- `src/components/project-wizard-new/ContractsStep.tsx` — defensive null render.
- `src/components/project-wizard-new/ReviewStep.tsx` + `UnifiedReviewStep.tsx` — hide contract card, show explainer for supplier.

No DB migration required. No changes to RLS or financial triggers — we're just not inserting a bogus contract row.
