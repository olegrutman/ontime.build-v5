
# Change Order Feature — Bug Analysis and Fix Plan

## Critical Bugs Found

### Bug 1: `co_activity.actor_user_id` FK references `profiles(id)` instead of `profiles(user_id)`
**Same FK bug we just fixed for `change_orders`**. The `co_activity` table has `FOREIGN KEY (actor_user_id) REFERENCES profiles(id)`, but the code inserts `user.id` (which is `auth.uid()` = `profiles.user_id`). This means **every activity log insert fails silently** — `logActivity()` in `COStatusActions` and the wizard creation activity log both fail.

**Fix**: DB migration to repoint FK to `profiles(user_id)`.

### Bug 2: `co_nte_log.requested_by_user_id` and `approved_by_user_id` FKs reference `profiles(id)` instead of `profiles(user_id)`
Same issue. NTE increase requests and approvals will fail with FK violations. Both `requestNTEIncrease` and `approveNTEIncrease` mutations in `useChangeOrderDetail` insert `user.id` (auth UID).

**Fix**: DB migration to repoint both FKs to `profiles(user_id)`.

### Bug 3: `LaborEntryForm` queries `profiles` by `id` instead of `user_id`
Line 57: `.eq('id', user.id)` — since `user.id` is the auth UID which lives in `profiles.user_id`, this query returns no row, so hourly rate is never pre-filled.

**Fix**: Change `.eq('id', user.id)` to `.eq('user_id', user.id)` in `LaborEntryForm.tsx` line 57.

### Bug 4: `HourlyRateSetting` queries `profiles` by `id` instead of `user_id`
Same issue in `HourlyRateSetting.tsx` — both the `select` (line ~54) and `update` (line ~62) use `.eq('id', user.id)`.

**Fix**: Change both to `.eq('user_id', user.id)`.

## Non-Critical Issues

### Issue 5: `co_labor_entries.line_total` — no computed column or trigger
The `line_total` column exists but the insert in `LaborEntryForm` doesn't send it. If there's no database trigger computing it, `line_total` will be null for all entries, making all financial calculations return 0.

**Check needed**: Verify if a trigger exists. If not, the code needs to compute and send `line_total` on insert.

### Issue 6: Console warnings — function components given refs
`DetailRow` and `COLineItemRow` components receive refs from parent but aren't wrapped in `forwardRef`. Non-breaking but noisy.

## Summary of Changes

### DB Migration (single migration)
```sql
-- Fix co_activity FK
ALTER TABLE co_activity DROP CONSTRAINT co_activity_actor_user_id_fkey;
ALTER TABLE co_activity ADD CONSTRAINT co_activity_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Fix co_nte_log FKs
ALTER TABLE co_nte_log DROP CONSTRAINT co_nte_log_requested_by_user_id_fkey;
ALTER TABLE co_nte_log ADD CONSTRAINT co_nte_log_requested_by_user_id_fkey
  FOREIGN KEY (requested_by_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE co_nte_log DROP CONSTRAINT co_nte_log_approved_by_user_id_fkey;
ALTER TABLE co_nte_log ADD CONSTRAINT co_nte_log_approved_by_user_id_fkey
  FOREIGN KEY (approved_by_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
```

### Code Fixes
1. **`src/components/change-orders/LaborEntryForm.tsx`** line 57: `.eq('id', user.id)` → `.eq('user_id', user.id)`
2. **`src/components/change-orders/HourlyRateSetting.tsx`** lines ~54 and ~62: both `.eq('id', user.id)` → `.eq('user_id', user.id)`
3. Check if `line_total` trigger exists; if not, compute it in LaborEntryForm before insert
