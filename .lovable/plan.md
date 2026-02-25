

# Fix Designated Supplier Search

## Problem

Two bugs in `DesignateSupplierDialog.tsx`:

1. **Wrong ID column**: The search selects `id` (profiles table primary key) instead of `user_id` (auth user ID). This means:
   - The current-user filter never works (compares profile PK to auth uid)
   - If a user is designated, the wrong ID gets stored in `project_designated_suppliers.user_id`, so the designated user would never be recognized when they log in

2. **No "no results" feedback**: When a search returns zero results, the UI shows nothing — no message telling the user nothing was found or suggesting they try the "Invite by Email" tab instead.

## Fix

### File: `src/components/project/DesignateSupplierDialog.tsx`

1. Change the query from `.select('id, full_name, email')` to `.select('user_id, full_name, email')`
2. Update the `Profile` interface: rename `id` to `user_id`
3. Update all references: `profile.id` becomes `profile.user_id`, `p.id` becomes `p.user_id`
4. Add an empty-state message after search completes with zero results, suggesting "Invite by Email" instead
5. Add `hasSearched` state to track whether the user has performed at least one search (so the empty message only shows after an actual search, not on initial load)

### Changes Summary

| Line | Current | Fixed |
|------|---------|-------|
| 19-23 | `id: string` | `user_id: string` |
| 54 | `.select('id, full_name, email')` | `.select('user_id, full_name, email')` |
| 60 | `p.id !== user?.id` | `p.user_id !== user?.id` |
| 170 | `key={profile.id}` | `key={profile.user_id}` |
| 189 | `handleDesignateUser(selectedUser.id, ...)` | `handleDesignateUser(selectedUser.user_id, ...)` |
| After results list | (nothing) | "No users found" message with link to Invite tab |

