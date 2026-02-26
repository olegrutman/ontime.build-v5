

# Fix Signup "Database error finding user"

## The Problem

There are 4 orphaned records in the `auth.identities` table -- identity rows that reference users who were previously deleted from `auth.users`. When a new user tries to sign up, the auth system checks for duplicate emails by scanning identities, finds an orphaned one, tries to load the matching user, and crashes with "User not found."

This affects any new email that doesn't conflict with these orphans too if the internal check fails broadly, but most critically it blocks signups for those specific emails.

## The Fix

A single database migration to delete the orphaned identity records:

```sql
DELETE FROM auth.identities
WHERE user_id NOT IN (SELECT id FROM auth.users);
```

This removes the 4 orphaned records (olegrutman@gmail.com, olegrutman+testfc@gmail.com, olegrutman+testtc@gmail.com, davin@builders.com) and restores normal signup behavior.

No code changes needed -- this is a data cleanup only.

