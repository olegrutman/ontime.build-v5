

# Fix: change_orders FK references wrong profiles column

## Problem
The foreign key `change_orders_created_by_user_id_fkey` references `profiles(id)` (the profile table's primary key), but the application code inserts `auth.uid()` (which matches `profiles.user_id`, not `profiles.id`).

- `profiles.id` = `6638289b-c781-495c-9dd9-373eef0321ab`
- `profiles.user_id` = `ef6822a5-c7c0-4a0d-8ac6-3e8647d0452a`
- Code sends `user.id` (`ef6822a5...`) → FK violation because that value isn't in `profiles.id`

## Fix
**DB migration** — Drop the existing FK and re-create it pointing to `profiles(user_id)`:

```sql
ALTER TABLE change_orders DROP CONSTRAINT change_orders_created_by_user_id_fkey;
ALTER TABLE change_orders ADD CONSTRAINT change_orders_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
```

No code changes needed — the application correctly uses `user.id` (auth UID) everywhere.

