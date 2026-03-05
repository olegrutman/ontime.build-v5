

# Fix: Org Creator Should Be Admin

## Problem
The `complete_signup` RPC inserts the org creator's `user_org_roles` record with `is_admin` defaulting to `false` (line 130). Since `owner@ontime.build` created "Ontime.build", they should be the admin.

## Fix

**1. Database migration** — two changes in one migration:

- **Update the `complete_signup` RPC** to set `is_admin = true` when creating a new org (the `new_org` path). The invite-accepted path stays `is_admin = false` (correct behavior).

- **Fix the existing record** for `owner@ontime.build`:
  ```sql
  UPDATE user_org_roles SET is_admin = true
  WHERE user_id = 'bd196a35-e30f-4a42-8c5c-d310be318ec3'
    AND organization_id = '4f47c536-01b4-4979-b968-c2ba627e302a';
  ```

No frontend changes needed — the auth context already reads `is_admin` from `user_org_roles`.

