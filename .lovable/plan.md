

## Fix: FC Input Request RPC Permission Check

**Root cause**: The `can_request_fc_change_order_input` database function has two restrictions that are too narrow:

1. **Line 69**: `co.created_by_role = 'GC'` — blocks TC-created COs from requesting FC input
2. **Line 72**: `co.status IN ('shared', 'rejected')` — missing `combined` and `draft` statuses

The frontend was already updated to allow these cases, but the backend RPC function still rejects them, returning `403 "You do not have permission..."`.

The CO being tested (`ec0411b1`) has `status = 'combined'` and `created_by_role = 'GC'` — the `combined` status is the immediate blocker.

**Fix**: Database migration to replace the `can_request_fc_change_order_input` function:

```sql
CREATE OR REPLACE FUNCTION public.can_request_fc_change_order_input(
  _co_id uuid,
  _fc_org_id uuid,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.change_orders co
    JOIN public.organizations org ON org.id = _fc_org_id
    JOIN public.project_team pt ON pt.project_id = co.project_id AND pt.org_id = _fc_org_id
    WHERE co.id = _co_id
      AND co.assigned_to_org_id IS NOT NULL
      AND public.user_in_org(_user_id, co.assigned_to_org_id)
      AND co.status IN ('draft', 'shared', 'rejected', 'combined')
      AND org.type = 'FC'
      AND _fc_org_id <> co.org_id
      AND _fc_org_id <> co.assigned_to_org_id
  );
$$;
```

Changes from original:
- Removed `co.created_by_role = 'GC'` — TC-created COs should also allow FC input requests
- Added `draft` and `combined` to the status list

**No frontend changes needed** — the UI already handles these statuses correctly.

