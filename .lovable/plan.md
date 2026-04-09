

# Fix: `project_setup_answers` NOT NULL constraint violation

## Problem
Line 1084-1089 maps ALL `answers` entries into rows for `project_setup_answers`, but some answer values are `null` or `undefined` (e.g., unanswered questions). The `value` column has a NOT NULL constraint, causing the insert to fail.

## Fix

### `src/hooks/useSetupWizardV2.ts`
- Filter out entries with `null`/`undefined` values before building `answerRows`:

```typescript
const answerRows = Object.entries(answers)
  .filter(([, value]) => value !== null && value !== undefined)
  .map(([field_key, value]) => ({
    project_id: pid,
    field_key,
    value,
    updated_at: new Date().toISOString(),
  }));
```

Single line change — everything else stays the same.

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Filter out null/undefined values before upserting to `project_setup_answers` |

