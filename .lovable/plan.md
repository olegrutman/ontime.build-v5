## Bug

CO Picker → "Where is the work happening?" never shows the basement and never uses the new "Main Floor" naming for Fuller Residence even though the project setup clearly captured a finished basement.

## Root cause

`StepWhere.tsx` queries a single table:

```ts
supabase.from('project_scope_details').select('*').eq('project_id', projectId).maybeSingle()
```

`project_scope_details` is only populated for **T&M / Remodel** projects (written from `CreateProjectNew.tsx` line 216). For standard contract projects (the wizard path used by Fuller Residence), the building info lives in `project_setup_answers` as key/value rows:

| field_key | value |
|---|---|
| stories | `1` |
| has_basement | `"yes"` |
| basement_type | `"Finished"` |
| basement_walkout | `"no"` |
| has_garage | `{enabled:true, subtype:"Attached"}` |
| has_rooftop_deck | `"no"` |
| … | … |

Because no `project_scope_details` row exists, the query returns `null`, `buildLocations(null)` returns `FALLBACK_LOCATIONS`, and the user sees the generic "Level 1 / Level 2 / Exterior / Other" set with no basement.

## Fix

Make `StepWhere.tsx` resilient to both data sources. Read `project_scope_details` first; if missing, fetch `project_setup_answers` and adapt the rows into the same shape `buildLocations()` expects.

### Implementation

1. In `StepWhere.tsx`, replace the single `useQuery` with one that:
   - Selects from `project_scope_details` (maybeSingle).
   - If `null`, selects all rows from `project_setup_answers` for the project and folds them into an object: `{ [field_key]: value }` (parsing JSON values).
   - Returns a normalized scope object with the keys `buildLocations` already uses: `floors`, `stories`, `foundation_type`, `basement_type`, `roof_type`, `has_balconies`, `decking_included`, `num_buildings`, plus an inferred `home_type`.

2. Map `project_setup_answers` keys to the normalized shape:
   - `stories` → `floors` and `stories`
   - `has_basement === "yes"` (or truthy) → `foundation_type = "basement"`
   - `basement_type` → `basement_type` (e.g., "Finished", "Walkout")
   - `basement_walkout === "yes"` → override `basement_type` label to "Walkout"
   - `roof_type` / `has_rooftop_deck` → carry over if present
   - `has_garage.enabled` → record but not used for floor levels
   - `num_buildings` → carry over if present
   - `home_type` / `building_type` → carry over if present

3. `buildLocations()` already handles the rest — basement first, "Main Floor" naming, etc.

### Files touched

- `src/components/change-orders/picker-v3/StepWhere.tsx` — only the `useQuery` block + a small `normalizeScope()` helper. No other files, no DB changes.

## Out of scope

- Backfilling `project_scope_details` for existing wizard projects (would be a separate, broader migration).
- Changing setup-wizard write paths.
- Any other consumer of `project_scope_details`.
