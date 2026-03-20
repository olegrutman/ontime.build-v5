

## Analysis: TC → FC Input Request Flow

### What works
- **TC requesting FC input**: Fixed in the last migration — RPC function now allows `combined` and `draft` statuses, no `created_by_role` restriction
- **FC can SELECT the CO**: `can_access_change_order()` grants access when FC has an `active` collaborator record
- **TC sees FC labor costs**: The detail page already shows "FC cost to TC" KPI when `fcLaborTotal > 0`, and the financial sidebar breaks down FC vs TC labor

### Issues found

**1. co_labor_entries INSERT policy — recursive RLS (BLOCKER)**
The INSERT policy still uses the raw subquery pattern:
```sql
WITH CHECK (org_id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()))
```
This is the same recursive RLS bug that broke `change_orders` and `co_line_items` inserts. When FC tries to save a labor entry, the subquery against `user_org_roles` (which has its own RLS) silently returns no rows → INSERT fails with 403.

**Fix**: Replace with `user_in_org()` security definer function. Same fix for UPDATE and DELETE policies.

**2. co_material_items and co_equipment_items INSERT/UPDATE/DELETE — same recursive RLS**
These tables have the identical raw subquery pattern. If FC or TC tries to add materials or equipment, same failure.

**Fix**: Replace all INSERT/UPDATE/DELETE policies on these tables to use `user_in_org()`.

**3. co_activity INSERT policy — same pattern**
The collaborator migration added a `can_access_change_order(co_id)` INSERT policy, but the original raw subquery INSERT policy may still exist alongside it. Need to verify and consolidate.

### Plan — Single database migration

Replace INSERT/UPDATE/DELETE policies on all CO child tables to use `user_in_org(auth.uid(), org_id)`:

- `co_labor_entries` — INSERT, UPDATE, DELETE
- `co_material_items` — INSERT, UPDATE, DELETE  
- `co_equipment_items` — INSERT, UPDATE, DELETE

```sql
-- co_labor_entries
DROP POLICY IF EXISTS "Labor entries insertable by own org" ON public.co_labor_entries;
CREATE POLICY "Labor entries insertable by own org" ON public.co_labor_entries
  FOR INSERT TO authenticated WITH CHECK (user_in_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Labor entries updatable by own org" ON public.co_labor_entries;
CREATE POLICY "Labor entries updatable by own org" ON public.co_labor_entries
  FOR UPDATE TO authenticated USING (user_in_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Labor entries deletable by own org" ON public.co_labor_entries;
CREATE POLICY "Labor entries deletable by own org" ON public.co_labor_entries
  FOR DELETE TO authenticated USING (user_in_org(auth.uid(), org_id));

-- Same pattern for co_material_items and co_equipment_items
```

### No frontend changes needed
- The `LaborEntryForm` already passes the correct FC org_id
- The `CODetailPage` already shows FC labor to TC in the KPI strip and financial sidebar
- The `canAddLabor` flag already allows FC to add labor when they're an active collaborator

