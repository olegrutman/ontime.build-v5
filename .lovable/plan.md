

# Fix: Finalize T&M RLS Error

## The Problem

The finalize mutation makes three separate inserts/updates from the client:
1. Insert into `change_order_fc_hours` -- RLS only allows FC role
2. Insert into `change_order_tc_labor` -- RLS only allows TC role  
3. Update `change_order_projects.pricing_mode` -- works fine

When TC finalizes, step 1 fails silently (RLS blocks it). When FC finalizes, step 2 fails.

## The Fix

Create a single `SECURITY DEFINER` database function `finalize_tm_work_order` that:
- Accepts `change_order_id`, `fc_hours`, `fc_rate`, `tc_hours`, `tc_rate`, and `user_id`
- Inserts the FC labor entry (locked)
- Inserts the TC labor entry
- Updates `pricing_mode` to `'fixed'`
- Runs as a transaction (all-or-nothing)

Then update `TMTimeCardsPanel.tsx` to call this RPC function instead of three separate queries.

## Database Migration

Create function `finalize_tm_work_order(...)` with `SECURITY DEFINER` that performs all three operations in one transaction.

## File Changes

| File | Change |
|---|---|
| New migration | Create `finalize_tm_work_order` database function |
| `TMTimeCardsPanel.tsx` | Replace three separate queries in `finalizeMutation` with a single `supabase.rpc('finalize_tm_work_order', {...})` call |

## Technical Details

### Database Function

```text
finalize_tm_work_order(
  p_change_order_id UUID,
  p_fc_hours NUMERIC,
  p_fc_rate NUMERIC,
  p_tc_hours NUMERIC,
  p_tc_rate NUMERIC,
  p_user_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
```

The function:
1. Validates the caller is a participant on the project
2. Inserts into `change_order_fc_hours` with `is_locked = true`
3. Inserts into `change_order_tc_labor`
4. Updates `change_order_projects` set `pricing_mode = 'fixed'`

### TMTimeCardsPanel.tsx Change

Replace the `finalizeMutation` body (lines 242-280) with:

```text
const { error } = await supabase.rpc('finalize_tm_work_order', {
  p_change_order_id: changeOrderId,
  p_fc_hours: totalFCHours,
  p_fc_rate: fcRate,
  p_tc_hours: totalHoursForGC,
  p_tc_rate: tcRate,
  p_user_id: user?.id,
});
if (error) throw error;
```

