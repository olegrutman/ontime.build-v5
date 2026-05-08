## Platform users can't see Change Orders on the project page

### Root cause

The `change_orders` table and all its sub-tables (`co_line_items`, `co_labor_entries`, `co_activity`, `co_audit_log`, `co_material_items`, `co_equipment_items`, `co_photos`, `co_evidence`, `co_scope_evidence`, `co_nte_log`, `co_combined_members`, `co_external_invites`) gate SELECT through `can_access_change_order(co_id)` / `user_in_org(...)` / `can_see_co_labor_entry(...)`. None of those helpers honor platform staff, so a `PLATFORM_OWNER` / `PLATFORM_ADMIN` / `SUPPORT_AGENT` who is not a participant in the project's orgs gets an empty list.

The codebase already has a SECURITY DEFINER helper `public.is_platform_user(auth.uid())` and uses the same pattern to expose other tables (e.g. profiles, organizations) to platform users.

### Fix

Add one permissive SELECT RLS policy per CO table that grants read access when `is_platform_user(auth.uid())` is true. Mirrors how other admin-readable tables are exposed.

```sql
CREATE POLICY "Platform users can view change orders"
  ON public.change_orders FOR SELECT TO authenticated
  USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_line_items"
  ON public.co_line_items FOR SELECT TO authenticated
  USING (public.is_platform_user(auth.uid()));
-- … same pattern for the remaining co_* tables listed above
```

Read-only. No write/insert/update/delete grants. No client code change needed — the existing `useChangeOrders` query will start returning rows once RLS allows them.

### Out of scope

- No changes to existing participant-based policies.
- No new platform impersonation flow.
- No edits to UI, tabs, sorting, or counts.
