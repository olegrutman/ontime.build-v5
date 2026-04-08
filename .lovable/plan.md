

# Add Basement Type Question + Conditional SOV Lines

## Problem
When a user says "Yes" to basement, we don't ask what kind. Finished basements require wall framing lines in the SOV; unfinished ones may not. Need a follow-up question and conditional SOV generation.

## Changes

### `src/hooks/useSetupWizardV2.ts`

**1. Add new question after `S_basement`:**
- `S_basement_type` — "What kind of basement?"
- `inputType: 'dropdown'`
- `fieldKey: 'basement_type'`
- Options: `['Finished', 'Partially finished', 'Unfinished']`
- `visibleWhen: { has_basement: 'yes' }` (only show if basement is Yes)
- `phase: 'mobilization_steel'`, `buildingTypes: 'all'`

**2. Update SOV generation (line ~718):**
- Always generate `Structural steel & post bases — Basement` and `Hardware & connectors — Basement` when basement is Yes
- Always generate `Floor system — Basement` when basement is Yes
- Only generate `Wall framing — Basement` when `basement_type` is `'Finished'` or `'Partially finished'`
- Add `Interior wall framing — Basement` line only when `basement_type === 'Finished'` (full layout of interior partition walls)

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Add basement type dropdown question; conditionally generate basement wall lines based on finish level |

