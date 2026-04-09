

# Add Basement Floor System Question + Dynamic Steel Levels Based on Story Count

## What You Asked (3 things)

1. **Basement floor system question**: Ask whether the basement has its own floor system or is slab on grade
2. **Move "Number of stories" to the top**: It should be asked before other scope questions
3. **Dynamic structural steel levels**: The floor checkboxes in the steel question should reflect the actual story count entered

## Current State

- "Number of stories" is in `TYPE_QUESTIONS` (phase: `per_floor`) — appears after the shared questions (contract value, material responsibility, basement, mobilization, steel)
- The structural steel floor picker has a hardcoded list: `['Basement', 'L1', 'L2', 'L3', 'Roof']`
- Basement SOV always generates a floor system line using the same `floor_system` answer — no separate question about basement floor type

## Changes

### 1. Add "Basement floor system" question (`useSetupWizardV2.ts`)
Add a new question `S_basement_floor_system` after `S_basement_walkout`:
- Label: "Basement floor system"
- Options: `['Has its own floor system', 'Slab on grade']`
- Conditional on `has_basement=yes`
- Field key: `basement_floor_system`

Update SOV generation (line ~740): if `basement_floor_system === 'Slab on grade'`, skip the "Floor system — Basement" line or label it differently.

### 2. Move "Number of stories" to top of question order
Move the stories questions (`Q1`, `Q1_track`, `Q1_th`) from `TYPE_QUESTIONS` into `SHARED_QUESTIONS` at the top (after `S0` contract value, before `S1` material responsibility). Keep them building-type-filtered. This makes stories appear first in the scope panel.

### 3. Dynamic structural steel floor options based on story count
In `WizardQuestion.tsx` (line 152), replace the hardcoded `floorOptions` array with a dynamic one:
- Read `answers.stories` to determine story count (1-N)
- Generate: `['Basement' (if has_basement), 'L1', 'L2', ... 'L{N}', 'Roof']`
- Pass `answers` (already available) to derive the list

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Add `S_basement_floor_system` question; move stories questions to top of `SHARED_QUESTIONS`; update SOV generation for basement slab case |
| `src/components/setup-wizard-v2/WizardQuestion.tsx` | Make `yes_no_floors` floor options dynamic based on `answers.stories` |

