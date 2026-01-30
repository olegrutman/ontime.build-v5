

# Plan: Complete Database Reset for Fresh Testing

## Current Data Summary

| Data Type | Count |
|-----------|-------|
| Projects | 4 |
| Organizations | 10 |
| Users/Profiles | Multiple (linked to orgs) |

## What Will Be Deleted

This will clear ALL test data from the following tables (in order to respect foreign key constraints):

### Child Tables (deleted first)
- Change order data (materials, equipment, labor, participants, checklist)
- Work items and participants
- T&M periods and entries
- Invoices and line items
- Purchase orders and line items
- Material orders and items
- Project contracts, SOVs, scope details
- Project team, participants, invites, relationships
- Notifications and reads
- Estimates and packs
- Cost rollups
- Labor entries

### Parent Tables (deleted after)
- Projects
- Suppliers and catalog items
- Organizations
- User org roles
- Org settings and invitations
- Profiles

### Auth Users
- All users from `auth.users` will be deleted

## Important Notes

1. **You will be logged out** - Your current user account will be deleted
2. **You'll need to sign up again** - Create new test accounts after the reset
3. **This cannot be undone** - All data will be permanently removed

## Database Migration

The cleanup will use a SQL migration that:
1. Disables triggers temporarily to avoid conflicts
2. Deletes data from child tables first (respecting foreign keys)
3. Deletes parent table data
4. Removes all auth users
5. Re-enables triggers

## After Reset

Once complete, you can:
1. Sign up with a new GC account
2. Create a TC account
3. Create an FC account
4. Create projects and test all invitation flows

