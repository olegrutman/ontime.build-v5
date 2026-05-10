# Allow platform staff to approve/reject COs

## Problem
Platform Owner viewing a CO sees "You do not have permission to approve" because:
1. **UI**: `usePermission('canApprove')` reads org-role permissions; platform users have no org membership → returns `false`.
2. **DB**: `change_orders` UPDATE policies are gated to `user_in_org(auth.uid(), assigned_to_org_id)`. Platform users have no membership in the assigned org, so the update returns 0 rows even if the button is forced through.

## Fix

### 1. Database — add platform-staff UPDATE policy on `change_orders`
New migration adds:
```sql
CREATE POLICY "Platform staff can update change orders"
ON public.change_orders FOR UPDATE
USING (public.is_platform_staff(auth.uid()))
WITH CHECK (public.is_platform_staff(auth.uid()));
```
The existing `apply_co_contract_delta` trigger handles `project_contracts.contract_sum` increments on status transitions to/from `approved` — no change there. The trigger does not consult `auth.uid()`, so it works the same for any caller.

### 2. Frontend — bypass UI permission check for platform staff
In `src/components/auth/RequirePermission.tsx`, update both `RequirePermission` and `usePermission` to short-circuit to `true` when `useAuth().isPlatformUser` is `true`. This single change unlocks every action button gated on `usePermission` for platform staff (approve, reject, create, etc.) without per-button changes.

Rationale: matches existing pattern where Platform Owner/Admin/Support Agent already have `canEditRecords` in `PLATFORM_ROLE_PERMISSIONS`.

### 3. Activity log attribution
The CO `approved_by_user_id` column will be set to the platform staff user id (Oleg). That's correct and traceable. No support_action_log entry is added in this iteration — actions taken from inside the project UI by platform staff are recorded by the normal CO activity feed via the existing audit triggers.

## Files touched
- New migration: `change_orders` SELECT-no-op + UPDATE policy for `is_platform_staff`.
- `src/components/auth/RequirePermission.tsx`: platform-user bypass in `usePermission` and `RequirePermission`.

## Verification
1. As Platform Owner navigate to the CO at `/project/.../change-orders/f9865ab8-...` → Approve button visible.
2. Click Approve → DB row updates, status transitions to `approved`, contract delta applied by trigger, no toast error.
3. Reject path works the same.
4. As a regular GC member without `canApprove`, behavior is unchanged (still blocked).

## Out of scope (call out only)
Invoices and POs have their own approve/reject paths with their own RLS. The frontend bypass in #2 also unlocks their UI buttons, but the DB updates will still fail unless we add similar `is_platform_staff` UPDATE policies on `invoices` and `purchase_orders`. If you want those covered too, say the word and I'll extend the migration in this same pass.
