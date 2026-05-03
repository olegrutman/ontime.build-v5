
# Fix: `notify_co_status_change` trigger references non-existent `is_tm` column

## Problem
The trigger function `notify_co_status_change()` on `change_orders` references `NEW.is_tm`, but the `change_orders` table has no `is_tm` column. This causes every CO approval/rejection to fail with: `record "new" has no field "is_tm"`.

## Fix
Replace `NEW.is_tm` with a lookup to the project's `contract_mode`:

```sql
_is_tm boolean := EXISTS (
  SELECT 1 FROM public.projects
  WHERE id = NEW.project_id AND contract_mode = 'tm'
);
```

This correctly determines whether the CO belongs to a T&M project, matching how the rest of the codebase resolves this.

## Files
- **One migration** to `CREATE OR REPLACE FUNCTION public.notify_co_status_change()` with the fix.
