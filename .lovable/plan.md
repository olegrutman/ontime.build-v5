

# Fix: Setup Wizard Shows Empty Phases

## Problem

`SetupWizardShell` line 45 uses `answers.building_type` as the slug to look up `options_by_type`. But the stored answer is the **display name** (`"Single Family"`), not the **slug** (`custom_home`). Since `options_by_type` keys are slugs, every question returns `undefined` and gets filtered out — resulting in zero visible questions across all 5 phases.

## Fix

### `SetupWizardShell.tsx` — Add display-name-to-slug mapping

Import the same `SLUG_MAP` concept (or a simpler reverse lookup) so that when `answers.building_type` is `"Single Family"`, it resolves to `custom_home`.

Change line 45 from:
```ts
const currentSlug = (answers.building_type as string) || buildingTypeSlug || 'custom_home';
```
To:
```ts
const DISPLAY_TO_SLUG: Record<string, string> = {
  'Multifamily 3-5': 'mf_3to5',
  'Multifamily 6+': 'mf_6plus',
  'Single Family': 'custom_home',
  'Townhome': 'townhome',
  'Mixed-Use': 'mixed_use_commercial',
  'Senior Living': 'senior_living',
  'Hospitality': 'hotel',
  'Industrial': 'industrial',
};

const rawType = (answers.building_type as string) || '';
const currentSlug = DISPLAY_TO_SLUG[rawType] || SLUG_MAP_IDENTITY[rawType] || buildingTypeSlug || 'custom_home';
```

This ensures **both** display names and raw slugs resolve correctly.

### Also handle `onBuildingTypeChange` callback

When user changes `building_type` dropdown in Phase 1, the `handleAnswer` callback in `SetupWizardShell` (line 59-72) maps display names to slugs — but the same `DISPLAY_TO_SLUG` map should be used there instead of the current hardcoded `slugMap`.

### Files changed

| File | Change |
|------|--------|
| `SetupWizardShell.tsx` | Add `DISPLAY_TO_SLUG` map; use it to resolve `currentSlug`; unify the `handleAnswer` slug mapping |

### What is NOT changing
- Database data, RLS, seed script
- `useSetupQuestions.ts`, `QuestionField.tsx`, `DynamicSection.tsx`
- `ProjectSetupFlow.tsx`

