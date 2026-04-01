

# Fix: Contract Duplicates on Every Save & Phantom SOV Prompts

## Root Cause

**Bug 1 — Duplicate contracts created on every save**: `handleSave` in `PhaseContracts.tsx` uses `existingContracts` from the React Query cache to find matching contracts. But it iterates over `filteredTeam` and does matching by org_id — the problem is the matching filter catches BOTH the original $0 contract (from AddTeamMemberDialog) AND any previously saved contract, because both have the same org pair. On the first save, self-heal works. But **on the second save**, the query cache still has stale data from before the first save's `invalidateQueries` resolves, so the filter finds only old records and creates NEW inserts for members that don't match by stale `to_project_team_id`.

The real fix: before running the save loop, **fetch fresh contracts directly from the database** instead of relying on the stale React Query cache. Then self-heal works every time.

**Bug 2 — SOV keeps prompting to create**: Because duplicate contracts exist (4 instead of 2), `contractsMissingSOVs` finds the 2 duplicate contracts that have no SOV associated and prompts the user to create SOVs for them.

## Fix Plan

### `PhaseContracts.tsx` — Fetch fresh data before save loop
1. At the start of `handleSave`, query `project_contracts` directly from Supabase (not from cache) to get the true current state
2. Use this fresh list for the `allMatching` filter and self-heal logic
3. This ensures duplicates are always caught and cleaned up, regardless of cache staleness

### DB Migration — Clean up existing duplicates
1. Write a one-time migration that deduplicates `project_contracts` rows for project `5a7d5e83-...`:
   - For each unique `(project_id, from_org_id, to_org_id, from_role, to_role)` group, keep the row that has an SOV linked (or the first one), delete the rest
   - This removes the 2 phantom contracts causing SOV prompts

## Files Modified
| File | Change |
|------|--------|
| `PhaseContracts.tsx` | Fetch fresh contracts at start of `handleSave` instead of using stale cache |
| DB migration | Delete duplicate contract rows for existing projects |

