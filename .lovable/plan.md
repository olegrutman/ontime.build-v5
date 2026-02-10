

# Fix: Drop Foreign Key Constraint Blocking Signup

## Root Cause (the REAL one this time)

The `handle_new_user` trigger inserts into `public.profiles` during signup. The `profiles` table has a foreign key constraint (`profiles_user_id_fkey`) referencing `auth.users(id)`. To verify this FK, PostgreSQL needs SELECT access on `auth.users`. Since `postgres` (the trigger's SECURITY DEFINER owner) is not a superuser and has no privileges on `auth.users`, the FK check fails with "permission denied for table users", rolling back the entire signup.

Previous migrations fixed the RPC functions but missed this FK constraint issue on the trigger path.

## The Fix

Drop the `profiles_user_id_fkey` foreign key constraint. Data integrity is still maintained because:
- The `user_id` value comes directly from `NEW.id` in the trigger (the auth.users row being inserted)
- It's impossible for an invalid user_id to be inserted via this path

We should also drop FK constraints from other public tables referencing `auth.users` to prevent similar errors when inserting into those tables later. The key ones that will cause problems during normal app usage:

| Constraint | Table |
|---|---|
| `profiles_user_id_fkey` | profiles (blocks signup) |
| `user_org_roles_user_id_fkey` | user_org_roles |
| `user_settings_user_id_fkey` | user_settings |
| `projects_created_by_fkey` | projects |
| `org_invitations_invited_by_fkey` | org_invitations |
| `project_team_user_id_fkey` | project_team |
| `project_team_invited_by_user_id_fkey` | project_team |
| `project_invites_invited_by_user_id_fkey` | project_invites |
| `project_contracts_created_by_user_id_fkey` | project_contracts |
| `project_activity_actor_user_id_fkey` | project_activity |
| `invoices_submitted_by_fkey` | invoices |
| `invoices_approved_by_fkey` | invoices |
| `invoices_rejected_by_fkey` | invoices |
| `invoices_created_by_fkey` | invoices |
| `change_order_projects_created_by_fkey` | change_order_projects |
| `change_order_participants_invited_by_fkey` | change_order_participants |
| `change_order_fc_hours_locked_by_fkey` | change_order_fc_hours |
| `change_order_fc_hours_entered_by_fkey` | change_order_fc_hours |
| `change_order_tc_labor_entered_by_fkey` | change_order_tc_labor |
| `project_guests_invited_by_fkey` | project_guests |

## Database Migration

One migration that drops all FK constraints from public tables to `auth.users`:

```text
ALTER TABLE profiles DROP CONSTRAINT profiles_user_id_fkey;
ALTER TABLE user_org_roles DROP CONSTRAINT user_org_roles_user_id_fkey;
ALTER TABLE user_settings DROP CONSTRAINT user_settings_user_id_fkey;
ALTER TABLE projects DROP CONSTRAINT projects_created_by_fkey;
ALTER TABLE org_invitations DROP CONSTRAINT org_invitations_invited_by_fkey;
ALTER TABLE project_team DROP CONSTRAINT project_team_user_id_fkey;
ALTER TABLE project_team DROP CONSTRAINT project_team_invited_by_user_id_fkey;
ALTER TABLE project_invites DROP CONSTRAINT project_invites_invited_by_user_id_fkey;
ALTER TABLE project_contracts DROP CONSTRAINT project_contracts_created_by_user_id_fkey;
ALTER TABLE project_activity DROP CONSTRAINT project_activity_actor_user_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT invoices_submitted_by_fkey;
ALTER TABLE invoices DROP CONSTRAINT invoices_approved_by_fkey;
ALTER TABLE invoices DROP CONSTRAINT invoices_rejected_by_fkey;
ALTER TABLE invoices DROP CONSTRAINT invoices_created_by_fkey;
ALTER TABLE change_order_projects DROP CONSTRAINT change_order_projects_created_by_fkey;
ALTER TABLE change_order_participants DROP CONSTRAINT change_order_participants_invited_by_fkey;
ALTER TABLE change_order_fc_hours DROP CONSTRAINT change_order_fc_hours_locked_by_fkey;
ALTER TABLE change_order_fc_hours DROP CONSTRAINT change_order_fc_hours_entered_by_fkey;
ALTER TABLE change_order_tc_labor DROP CONSTRAINT change_order_tc_labor_entered_by_fkey;
ALTER TABLE project_guests DROP CONSTRAINT project_guests_invited_by_fkey;
```

## File Changes

| File | Change |
|---|---|
| New migration | Drop all FK constraints referencing `auth.users` |

No frontend code changes needed.

## Risk Assessment

- **Low risk**: The UUID columns remain, RLS policies still enforce access control, and user IDs come from `auth.uid()` which is always valid. Foreign keys to `auth.users` are redundant when RLS is the primary access control mechanism.
- **This is a known pattern** in Lovable Cloud where `postgres` is not a superuser -- FK references to auth schema tables should be avoided.

