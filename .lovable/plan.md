

# Add Basement Gate Before Structural Steel

## Problem
1. The basement question doesn't appear for Custom Home (only MF/Hotel/Senior Living)
2. Structural steel is asked before basement — should be the other way around
3. The structural steel floor picker always shows "Basement" as an option, even when the user answered No to basement or wasn't asked

## Changes

### `src/hooks/useSetupWizardV2.ts`

**Move & expand basement question:**
- Move Q2_basement before S3 (structural steel) in the question order — place it in `SHARED_QUESTIONS` or at the start of `TYPE_QUESTIONS` so it's asked first
- Add `custom_home` to the `buildingTypes` array (Custom Home can have basements too)
- Keep it as a simple yes/no, tag `conditional` or `always` depending on desired behavior

**Reorder shared questions:** Change order to S1 (material responsibility) → Q2_basement → S2 (mobilization) → S3 (structural steel), so basement is answered before the steel floor picker needs it.

### `src/components/setup-wizard-v2/WizardQuestion.tsx`

**Dynamic floor options for `yes_no_floors`:**
- Instead of hardcoded `['Basement', 'L1', 'L2', 'L3', 'Roof']`, pass the current answers into the question renderer
- Only include `'Basement'` in the floor list if `answers.has_basement === 'yes'`
- This requires passing `answers` as a prop to `WizardQuestion` (or the floor list as a derived prop)

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Move basement question before steel; add custom_home to its building types |
| `src/components/setup-wizard-v2/WizardQuestion.tsx` | Make floor options dynamic based on basement answer |
| `src/components/setup-wizard-v2/SetupWizardV2.tsx` | Pass `answers` to WizardQuestion so it can derive floor options |

