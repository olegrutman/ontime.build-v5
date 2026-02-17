

# Show All Matching Companies in Join Search

## Problem
The organization search in the "Find Your Company" step currently limits results to 20 entries. When multiple companies share the same name, some may be hidden.

## Changes

### 1. Increase the search limit in the frontend call
**File: `src/components/signup-wizard/JoinSearchStep.tsx`**
- Change `_limit: 20` to `_limit: 100` (or remove the limit parameter to use a higher default)

### 2. Update the database function default limit
**Database migration**
- Update the `search_organizations_for_join` function to increase the default `_limit` from `20` to `100`, ensuring all matching companies are returned even without a frontend override

| File | Change |
|------|--------|
| `src/components/signup-wizard/JoinSearchStep.tsx` | Change `_limit: 20` to `_limit: 100` |
| Database migration | Update default `_limit` from `20` to `100` |

