

# Schedule Auto-Creation from SOV: Current State and Fix

## Findings

Schedule items **are** being created from SOV items, but only via **client-side code** (`createScheduleItemsFromSOVItems` called in 3 places). This is fragile — if SOV items are created through any other path (direct DB insert, edge function, etc.), schedule items won't be generated. The data confirms the primary contract's SOV items have linked schedule tasks, while the second contract's do not (by design to avoid duplicates).

## Plan: Add a Database Trigger

Create a Postgres trigger on `project_sov_items` that automatically creates a matching `project_schedule_items` row on INSERT — but **only if** no schedule item already exists for that SOV item (idempotent). This replaces the need for client-side calls and guarantees schedule items are always created.

### Database Migration

```sql
CREATE OR REPLACE FUNCTION public.auto_create_schedule_from_sov()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if no schedule item already linked to this SOV item
  IF NOT EXISTS (
    SELECT 1 FROM public.project_schedule_items 
    WHERE sov_item_id = NEW.id
  ) THEN
    INSERT INTO public.project_schedule_items (
      project_id, title, item_type, sov_item_id,
      start_date, progress, sort_order, dependency_ids
    ) VALUES (
      NEW.project_id, NEW.item_name, 'task', NEW.id,
      CURRENT_DATE, 0, NEW.sort_order, '{}'::text[]
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auto_create_schedule_from_sov
  AFTER INSERT ON public.project_sov_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_schedule_from_sov();
```

### Code Cleanup

Remove the now-redundant client-side `createScheduleItemsFromSOVItems` calls from:
- `src/hooks/useContractSOV.ts` (lines 624-627 and 754-757)
- `src/components/sov/UploadSOVDialog.tsx` (lines 154-157)

Keep the `createScheduleItemsFromSOVItems` function definition as a utility but stop calling it — the trigger handles it.

### Backfill Existing SOV Items

Run a one-time data insert to create schedule items for SOV items that currently have none:

```sql
INSERT INTO project_schedule_items (project_id, title, item_type, sov_item_id, start_date, progress, sort_order, dependency_ids)
SELECT sov.project_id, sov.item_name, 'task', sov.id, CURRENT_DATE, 0, sov.sort_order, '{}'::text[]
FROM project_sov_items sov
WHERE NOT EXISTS (
  SELECT 1 FROM project_schedule_items sch WHERE sch.sov_item_id = sov.id
);
```

### Files to Modify

| File | Change |
|------|--------|
| **Database migration** | Add `auto_create_schedule_from_sov` trigger |
| **Database insert** | Backfill missing schedule items |
| `src/hooks/useContractSOV.ts` | Remove `createScheduleItemsFromSOVItems` calls (keep function) |
| `src/components/sov/UploadSOVDialog.tsx` | Remove `createScheduleItemsFromSOVItems` call |

