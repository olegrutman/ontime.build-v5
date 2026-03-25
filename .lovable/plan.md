

# Clear All SOVs from Project

## What
Delete all SOV data for project `7295c3d2-90be-4bb9-94bc-99f000b2fdd8`:
1. Delete all rows from `project_sov_items` where `project_id` matches
2. Delete all rows from `project_sov` where `project_id` matches

Order matters — items first (they reference `project_sov`), then the parent SOV records.

## How
Two DELETE statements via the data insert tool:
```sql
DELETE FROM project_sov_items WHERE project_id = '7295c3d2-90be-4bb9-94bc-99f000b2fdd8';
DELETE FROM project_sov WHERE project_id = '7295c3d2-90be-4bb9-94bc-99f000b2fdd8';
```

No code changes needed.

