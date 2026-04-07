

# Fix: Setup Wizard Shows No Fields (Double-Encoding Bug)

## Root Cause

The seeding code in `ProjectSetupFlow.tsx` (line 118) wraps values in `JSON.stringify()` before passing them to Supabase's `.upsert()`. But the Supabase JS client already handles JSON serialization for JSONB columns automatically. This causes **double-encoding**:

- Stored: `"\"Multifamily 3-5\""` instead of `"Multifamily 3-5"`
- Read back: `answers.building_type = '"Multifamily 3-5"'` (with literal quotes)
- Lookup: `DISPLAY_TO_SLUG['"Multifamily 3-5"']` → `undefined` → slug = `'"Multifamily 3-5"'`
- Filter: `options_by_type['"Multifamily 3-5"']` → `undefined` for ALL questions
- Result: **zero questions rendered**

Same problem affects `name`, `address`, and `status` fields.

## Changes

### 1. Fix seeding code — remove JSON.stringify

**File: `src/components/project-setup/ProjectSetupFlow.tsx`** (line ~118)

Change:
```typescript
seeds.map(s => ({ project_id: projectId, field_key: s.field_key, value: JSON.stringify(s.value) }))
```
To:
```typescript
seeds.map(s => ({ project_id: projectId, field_key: s.field_key, value: s.value }))
```

### 2. Fix existing corrupted data

**Database migration** — Run a one-time fix to unwrap double-encoded JSONB values in `project_setup_answers`:

```sql
UPDATE project_setup_answers
SET value = value #>> '{}'
WHERE jsonb_typeof(value) = 'string'
  AND (value #>> '{}') LIKE '"%"'
  AND field_key IN ('name', 'building_type', 'status', 'start_date', 'end_date', 'description');

UPDATE project_setup_answers
SET value = (value #>> '{}')::jsonb
WHERE jsonb_typeof(value) = 'string'
  AND field_key = 'address'
  AND (value #>> '{}') LIKE '{%}';
```

### 3. Add defensive parsing in useSetupQuestions

**File: `src/hooks/useSetupQuestions.ts`** — In the answers query, unwrap any lingering double-encoded string values so the wizard works even if some rows haven't been fixed:

```typescript
// After reading row.value, unwrap if it's a double-encoded string
let val = row.value;
if (typeof val === 'string') {
  try { val = JSON.parse(val); } catch {}
}
map[row.field_key] = val;
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/project-setup/ProjectSetupFlow.tsx` | Remove `JSON.stringify` from seed upsert (line ~118) |
| `src/hooks/useSetupQuestions.ts` | Add defensive unwrap for double-encoded JSONB values in answers query |
| Database migration | Fix existing corrupted rows in `project_setup_answers` |

### What is NOT changing
- Setup questions table, RLS policies, other components

