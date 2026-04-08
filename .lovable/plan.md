

# Add Contract Value Question + Fix SOV Dollar Amounts

## Problem
1. SOV preview always shows "$0.00" for every line — useless without a contract value
2. Completing setup may error (likely related to missing data or save logic)

## Changes

### 1. `src/hooks/useSetupWizardV2.ts`

**Add contract value question as the first shared question (before material responsibility):**
- New question `S0` — "What is the total contract value?" 
- `inputType: 'number'`, `fieldKey: 'contract_value'`, `phase: 'mobilization_steel'`, `tag: 'always'`, `buildingTypes: 'all'`
- Place it first in `SHARED_QUESTIONS` so it's asked right after building type selection

**Update `generateSOVLines()` to distribute dollar amounts:**
- Read `answers.contract_value` as the total
- Divide evenly across all generated lines (or use a simple equal-split for now)
- Each `SOVLine.amount` gets `contractValue / totalLines` (rounded, last line absorbs remainder)

**Fix save mutation:**
- Add error logging in the `mutationFn` catch path so we can identify the save error
- Ensure `contract_value` answer syncs to `project_contracts` table if a contract exists (update `contract_sum`)

### 2. `src/components/setup-wizard-v2/SOVLivePreview.tsx`

**Display real dollar amounts instead of hardcoded "$0.00":**
- Replace `$0.00` with `$${line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
- Show total contract value in the header summary

### 3. `src/components/setup-wizard-v2/WizardQuestion.tsx`

**Support `number` input type for currency:**
- The `number` input already exists but needs formatting for currency (dollar sign prefix, commas)
- Add currency formatting when `fieldKey` includes `contract_value` or `value`

### 4. `src/components/setup-wizard-v2/SetupWizardV2.tsx`

**Add `STEP_PHASES` mapping** — ensure `mobilization_steel` phase questions (where `S0` lives) appear in the `structure` step so contract value is asked early

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Add contract value question; distribute amounts in SOV generation; improve save error handling |
| `src/components/setup-wizard-v2/SOVLivePreview.tsx` | Show real dollar amounts and total |
| `src/components/setup-wizard-v2/WizardQuestion.tsx` | Currency formatting for contract value input |

