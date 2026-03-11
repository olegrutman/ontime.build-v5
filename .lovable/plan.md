

# Filter Schedule Auto-Generation to TC→GC SOV Only

## Problem
The database trigger `auto_create_schedule_from_sov` creates a schedule task for **every** `project_sov_items` insert, regardless of which contract the SOV belongs to. This results in duplicate/irrelevant schedule tasks from Field Crew→TC or Supplier contracts. The user wants only **Trade Contractor → General Contractor** SOV items to generate schedule tasks.

## Solution
Update the `auto_create_schedule_from_sov` trigger function to join through `project_sov → project_contracts` and only create a schedule item when the contract's `from_role = 'Trade Contractor'` and `to_role = 'General Contractor'`.

## Database Migration

```sql
CREATE OR REPLACE FUNCTION public.auto_create_schedule_from_sov()
RETURNS TRIGGER AS $$
DECLARE
  v_from_role TEXT;
  v_to_role TEXT;
BEGIN
  -- Look up the contract direction via project_sov
  SELECT pc.from_role, pc.to_role
  INTO v_from_role, v_to_role
  FROM public.project_sov ps
  JOIN public.project_contracts pc ON pc.id = ps.contract_id
  WHERE ps.id = NEW.sov_id;

  -- Only create schedule items for TC → GC contracts
  IF v_from_role = 'Trade Contractor' AND v_to_role = 'General Contractor' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.project_schedule_items 
      WHERE sov_item_id = NEW.id
    ) THEN
      INSERT INTO public.project_schedule_items (
        project_id, title, item_type, sov_item_id,
        start_date, progress, sort_order, dependency_ids
      ) VALUES (
        NEW.project_id, NEW.item_name, 'task', NEW.id,
        CURRENT_DATE, 0, NEW.sort_order, '{}'::uuid[]
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

## Files

| File | Change |
|------|--------|
| Database migration | Update `auto_create_schedule_from_sov` to filter by TC→GC contract direction |

No frontend code changes needed — the trigger is the only mechanism that generates schedule items from SOV.

