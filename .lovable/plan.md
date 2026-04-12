

# Fix: T&M Scope Details Not Saving — Check Constraint Mismatch

## Root Cause
The database has a check constraint `project_scope_details_home_type_check` that only allows `'Custom Home'` and `'Track Home'` as `home_type` values. The code is now sending slug values like `custom_home`, `apartments_mf`, etc. — which the constraint rejects silently (the error toast may not have appeared or was dismissed).

The DB error log confirms: `new row for relation "project_scope_details" violates check constraint "project_scope_details_home_type_check"`

## Fix (two parts)

### 1. Drop and recreate the check constraint via migration
Remove the overly restrictive constraint and replace it with one that includes all valid building types:
```sql
ALTER TABLE project_scope_details DROP CONSTRAINT project_scope_details_home_type_check;
ALTER TABLE project_scope_details ADD CONSTRAINT project_scope_details_home_type_check
  CHECK (home_type = ANY (ARRAY[
    'custom_home', 'track_home', 'townhomes',
    'apartments_mf', 'hotel_hospitality', 'senior_living'
  ]));
```

### 2. Update the `VisualLocationPicker` fallback
The location picker derives `isSingleFamily` from slug values — that's already correct after the previous changes. No code changes needed.

### 3. Update the `ProjectInfoSummary` label formatting
The summary component formats `home_type` using `replace(/_/g, ' ')` + capitalize — already handles slugs. No change needed.

## Result
After this migration, T&M project creation will successfully save building info to `project_scope_details`, and the WO wizard location picker will read and filter correctly.

