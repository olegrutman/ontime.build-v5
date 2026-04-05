

# Fix: Filter Questions by Correct Building Category

## Problem

The test project "Test Residence 001" has `project_type = "Single Family Home"` in the `projects` table, but the `building_type` answer in `project_setup_answers` was incorrectly seeded as `"Multifamily 3-5"` from a previous bug. The seeding logic in `ProjectSetupFlow.tsx` only seeds if `building_type` doesn't already exist — so the wrong value persists, and the user sees 90 multifamily questions (elevator shafts, stair towers, steel columns, etc.) instead of the correct 77 single-family questions.

The filtering engine itself works correctly — the bug is that the seeded `building_type` answer doesn't match the project's actual type.

## Fix

### 1. `ProjectSetupFlow.tsx` — Always reconcile `building_type` with project record

Instead of only seeding `building_type` when it doesn't exist, **always overwrite** it if the current answer doesn't match the project's `project_type`. This prevents stale/incorrect values from persisting.

Change the seeding logic from:
```ts
if (!existingKeys.has('building_type') && displayName) seeds.push(...)
```
To:
```ts
// Always ensure building_type matches the project record
const currentBT = existingAnswers?.find(r => r.field_key === 'building_type');
if (displayName && (!currentBT || needsSync)) seeds.push({ field_key: 'building_type', value: displayName });
```

Fetch the current `building_type` value (not just key existence) and compare it against the expected display name derived from `projects.project_type`. If they don't match, upsert the correct value.

### 2. Fix existing bad data

Run a one-time correction to update the test project's `building_type` answer from `"Multifamily 3-5"` to `"Single Family"` so the fix takes effect immediately.

### Files changed

| File | Change |
|------|--------|
| `ProjectSetupFlow.tsx` | Compare existing `building_type` value against project record; overwrite if mismatched |

### What is NOT changing
- The filtering engine in `useSetupQuestions.ts` (already correct)
- `SetupWizardShell.tsx` slug mapping (already correct)
- Database schema or RLS

