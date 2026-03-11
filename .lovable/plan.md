

# Fix: Schedule Progress Update Failing

## Root Cause
The database trigger `sync_schedule_to_sov` (in migration `20260309014106`) fires on every `project_schedule_items` update and tries to set `updated_at = now()` on the `project_sov_items` table. But `project_sov_items` does not have an `updated_at` column, causing every schedule update to fail with error `column "updated_at" of relation "project_sov_items" does not exist`.

The same issue exists in `sync_invoice_to_schedule` which also sets `updated_at = now()` on `project_schedule_items` — though that table does have the column, so it works there.

## Fix
Run a database migration that does one of:
- **Option A (recommended):** Add `updated_at` column to `project_sov_items`
- **Option B:** Remove the `updated_at = now()` line from the `sync_schedule_to_sov` trigger function

Option A is better because it adds proper timestamp tracking to `project_sov_items`.

## Migration SQL
```sql
-- Add missing updated_at column to project_sov_items
ALTER TABLE public.project_sov_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add trigger to auto-update the timestamp
CREATE TRIGGER update_project_sov_items_updated_at
  BEFORE UPDATE ON public.project_sov_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

No code changes needed — the hook already sends `updated_at` correctly.

| File | Action |
|------|--------|
| Database migration | ADD `updated_at` column to `project_sov_items` + auto-update trigger |

