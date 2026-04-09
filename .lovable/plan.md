

# Project Setup Analysis — Bugs & Fixes

## Bugs Found

### Bug 1: Contract status constraint violation (CRITICAL)
The `_saveContractAndSov` function inserts contracts with `status: 'Draft'` (line 1027), but the database constraint `project_contracts_status_check` only allows `'Invited'`, `'Accepted'`, or `'Active'`. **This causes project creation to fail silently or throw an error.**

**Fix:** Change `status: 'Draft'` to `status: 'Active'` in `_saveContractAndSov`.

### Bug 2: Contract direction is wrong for TC upstream contract
When a TC creates a project, the upstream contract (GC→TC) is saved with `from_role: 'Trade Contractor'` and `to_role: 'General Contractor'`. Per the system's contract direction rules ("from" = contractor/invoice sender, "to" = client/payer), the GC→TC contract should have `from_role: 'Trade Contractor'` and `to_role: 'General Contractor'` — this is actually correct (TC bills GC). However the `from_org_id` is set to the TC org but `to_org_id` is null for both contracts. The GC and FC orgs aren't known yet at creation time, so this is expected — but should be documented.

### Bug 3: `sovLines` in the hook always uses `contract_value` from answers — works correctly
The `sovLines` memo calls `generateSOVLines(buildingType, answers)` which reads `answers.contract_value`. Since `setAnswer('contract_value', ...)` updates the answers state, the SOV lines do reflect the entered contract value. **This is wired correctly.**

### Bug 4: TC SOV labeling is backwards
The SOV labels say "GC → TC" and "TC → FC" which is correct from a billing/contract perspective. No bug here.

### Bug 5: Review step shows `$0` for contract value (screenshot shows this)
The review step reads `answers.contract_value` — if the user entered a value and it was stored correctly via `setAnswer`, this should work. The `$0` in the screenshot suggests the contract value wasn't entered or the step was skipped. Need to verify `canProceed` is enforcing contract entry — it does (case 1 checks `contract_value > 0`).

## What I'll Fix

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Fix contract `status: 'Draft'` → `status: 'Active'` in `_saveContractAndSov` |

## TC Dual SOV Confirmation
The dual SOV system is already implemented correctly:
- **ContractsStep**: TC sees two inputs (GC contract + FC contract) ✓
- **ScopeQuestionsPanel**: TC sees two SOV previews side-by-side with same percentages, different amounts ✓
- **UnifiedReviewStep**: TC sees both contracts and SOVs in review ✓
- **saveAll**: Creates two `project_contracts` + two `project_sov` + two sets of `project_sov_items` for TC ✓

The only real bug preventing the system from working is the `'Draft'` status constraint violation.

