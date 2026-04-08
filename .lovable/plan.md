

# Update Material Responsibility Question to Ask "Who"

## Problem
The current question says "Material responsibility" with options "Labor only / Furnish & install / Split." This is ambiguous — a GC setting up the project doesn't know if "Labor only" means *they* supply materials or the TC does. It needs to clearly ask **who** is responsible.

## Change

### `src/hooks/useSetupWizardV2.ts` (line ~88-97)
Update the shared question S1:
- **Label**: `"Who is responsible for materials?"` 
- **Options**: `['GC supplies materials', 'TC supplies materials', 'Split responsibility']`
- **fieldKey** stays `material_responsibility` — no downstream breakage

Update any references in `generateSOVLines()` that check `material_responsibility` values to match the new option strings (e.g., `'GC supplies materials'` instead of `'Furnish & install'`).

### `src/components/setup-wizard-v2/WizardQuestion.tsx`
No changes needed — already renders dropdown options dynamically.

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Update S1 label, options, and any value checks in SOV generation |

