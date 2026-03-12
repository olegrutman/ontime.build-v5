

# Schedule Clear & Regeneration: Bug Analysis

## What I Found

### Bug 1: No end dates after regeneration
When you click "Clear & Regenerate," new tasks are created with `start_date: today` but **no `end_date`**. They show up as zero-duration items on the Gantt chart. The user has to manually click "Auto-Estimate" afterwards to give them durations. The regeneration should automatically estimate dates right after creating the new items.

**Fix**: Call `handleAutoEstimate()` (or inline that logic) at the end of `handleRegenerate`, after all SOV items are inserted.

### Bug 2: SOV selection is not filtered to TC→GC contract
The regeneration grabs the **first SOV** it finds on the project (`sovs[0]`). It should specifically look for the TC→GC contract SOV (matching the auto-generation trigger's behavior). If the first SOV happens to be from a different contract (e.g. a work order SOV), the schedule gets wrong items.

**Fix**: Join `project_sov` with `project_contracts` and filter for `from_role = 'Trade Contractor'` and `to_role = 'General Contractor'` (or fall back to whatever the highest-upstream contract is).

### Bug 3: Sequential deletes are slow
Each schedule item is deleted one-by-one with `await deleteItem.mutateAsync(item.id)` in a loop. For a schedule with 15+ items, this means 15+ sequential API calls just for deletion, plus N more for insertion. Each call also triggers a query invalidation/refetch.

**Fix**: Use a single bulk delete via Supabase: `supabase.from('project_schedule_items').delete().eq('project_id', projectId)` instead of looping. Then invalidate the query once after.

### Bug 4: Query cache invalidation storms
Each `deleteItem.mutateAsync` and `addItem.mutateAsync` call triggers `queryClient.invalidateQueries` (via `onSuccess`). During regeneration, this means dozens of refetch cycles mid-operation, causing UI flicker and wasted network calls.

**Fix**: Wrap the regeneration in a single transaction-like approach: do the bulk delete + bulk insert directly via Supabase client, then invalidate the query cache once at the end.

## Proposed Changes

| File | Change |
|------|--------|
| `src/components/schedule/ScheduleTab.tsx` | Rewrite `handleRegenerate`: use bulk delete, filter SOV to TC→GC contract, auto-estimate dates after inserting, single cache invalidation |
| `src/hooks/useProjectSchedule.ts` | Add a `deleteAll` mutation that deletes all items for a project in one call |

