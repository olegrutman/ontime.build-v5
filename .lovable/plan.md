

# Fix: SOV Lock State Not Propagating to "Finish Setup" Button

## Problem
After locking SOVs, the "Finish Setup & Activate Project" button stays disabled because it reads from a stale React Query cache (`project_sovs_lock_check`) that is never invalidated when SOVs are locked.

## Root Cause
Two separate data sources for SOV lock status:
1. `useContractSOV.ts` → `toggleSOVLock()` updates **local `useState`** only (line 1170-1174) — no query invalidation
2. `PhaseSOV.tsx` → reads from `useQuery(['project_sovs_lock_check', projectId])` — a completely separate cache entry that never gets refreshed

When the user locks an SOV inside `ContractSOVEditor`, only the local state in `useContractSOV` updates. The `PhaseSOV` query still has stale `is_locked: false` data.

## Fix

### Option A (Simplest): Add `refetchInterval` or listen to lock changes
Make `PhaseSOV`'s SOV query refetch after the `ContractSOVEditor` triggers a lock. Two approaches:

**Chosen approach**: After `toggleSOVLock` succeeds, invalidate the `project_sovs_lock_check` query using the React Query client.

### Changes

**`src/hooks/useContractSOV.ts`**
- Import `useQueryClient` from `@tanstack/react-query`
- After successful lock/unlock in `toggleSOVLock`, call `queryClient.invalidateQueries({ queryKey: ['project_sovs_lock_check', projectId] })` and also `queryClient.invalidateQueries({ queryKey: ['project_sovs', projectId] })`
- This ensures any component reading SOV lock state from React Query gets fresh data

**`src/components/project-setup/PhaseSOV.tsx`**
- No changes needed — once the query is invalidated, `useQuery` auto-refetches

### Secondary fix: Also invalidate readiness queries
- In `toggleSOVLock`, also invalidate `['project_readiness']` or trigger recalculation so the readiness checklist updates too

## Files Modified
| File | Change |
|------|--------|
| `useContractSOV.ts` | Add `useQueryClient`, invalidate `project_sovs_lock_check` after lock toggle |

