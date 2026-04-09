
I know what the issue is.

What I found:
1. The current blocker is not the answer save anymore. The failing request is `project_sov_items` insert.
2. The exact cause is in `src/hooks/useSetupWizardV2.ts`: wizard-created SOV items are saved with `source: 'wizard_v2'`, but the database only allows `source IN ('template', 'user')`. That is why project creation dies after the first contract/SOV is created.
3. Because that first SOV item insert throws, the code never reaches the second TC→FC contract/SOV creation. That is why you end up with only one persisted SOV.
4. Material responsibility is also broken in the create flow:
   - The Contracts page renders the material question from `visibleQuestions`
   - `visibleQuestions` is empty until a building type is selected
   - But Building Type is step 3, after Contracts
   - Result: material responsibility is usually never shown, so `project_contracts.material_responsibility` gets saved as `null`
5. There is another mismatch after that: the wizard stores strings like `GC supplies materials`, but the rest of the app reads contract records as `GC` / `TC` (and sometimes `SPLIT`). So even once shown, it still needs normalization before saving to the contract record.
6. Console evidence shows a separate bug in `AddTeamMemberDialog`: search results use `key={result.org_id}`, but the same org can appear multiple times for different contacts. That duplicate key warning can cause missing/duplicated search rows.

Plan to fix:
1. Fix the SOV persistence blocker in `src/hooks/useSetupWizardV2.ts`
   - Change wizard-generated SOV item `source` from `wizard_v2` to `template`
   - Keep the wizard-specific metadata in existing fields like `scope_section_slug` / `ai_original_pct`
   - This should immediately stop the `project_sov_items_source_check` failure

2. Fix dual-contract creation so both SOVs persist
   - Once the first SOV item insert stops failing, the existing downstream TC→FC creation path can complete
   - Verify both contracts are created for TC projects:
     - GC → TC contract + SOV
     - TC → FC contract + SOV

3. Fix material responsibility on the Contracts page
   - Make the Contracts step render material responsibility independently of `buildingType`
   - Do not depend on `visibleQuestions` for this field
   - Keep the Contracts page as the authoritative contract-entry page

4. Normalize material responsibility before saving the contract record
   - Map wizard answers to contract values:
     - `GC supplies materials` → `GC`
     - `TC supplies materials` → `TC`
     - `Split responsibility` → `SPLIT`
   - Save the normalized value to `project_contracts.material_responsibility`
   - Keep the wizard answer format unchanged if needed for SOV-generation logic

5. Harden the end-to-end create flow
   - Make sure the project is not left half-created when a later save step fails
   - Add guarded error handling around project/contracts/SOV creation so partial setup records do not remain if persistence breaks mid-flow

6. Fix the duplicate React key bug in `src/components/project/AddTeamMemberDialog.tsx`
   - Replace `key={result.org_id}` with a unique composite key using org + contact/email
   - This removes the duplicate-key warning and stabilizes the search results UI

Files to update:
- `src/hooks/useSetupWizardV2.ts`
- `src/components/project-wizard-new/ContractsStep.tsx`
- `src/components/project/AddTeamMemberDialog.tsx`
- Possibly `src/pages/CreateProjectNew.tsx` only if small wiring cleanup is needed

How I’ll validate after implementation:
1. Run the full TC project-creation flow end to end
2. Confirm Create Project finishes without toast errors
3. Confirm two contracts are created
4. Confirm two SOV records are created
5. Confirm SOV line items are inserted for both SOVs
6. Confirm material responsibility is saved on the main contract record in the normalized format the rest of the app expects
7. Confirm no duplicate-key warning remains in the team search UI
