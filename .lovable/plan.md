
# Add RFI Count Badge to Operational Summary

## What Changes

Add a fifth tile to the Operational Summary grid on the Project Overview tab showing open RFIs. This tile will match the existing tile pattern (icon, uppercase label, count badge, clickable "View All" to navigate to the RFIs tab).

## Implementation

### File Modified: `src/components/project/OperationalSummary.tsx`

1. **Import** `MessageSquareMore` icon from lucide-react (matches the sidebar icon for RFIs).
2. **Add state** for `openRfiCount` (number) and `loadingRfis` (boolean).
3. **Fetch open RFI count** in the existing `useEffect` block:
   - Query `project_rfis` table filtered by `project_id` and `status = 'OPEN'`, using `.select('id', { count: 'exact', head: true })` to get just the count without transferring rows.
4. **Add a new tile** in the grid (after "Recent Invoices", before "Team") showing:
   - `MessageSquareMore` icon + "Open RFIs" label
   - Bold count number with a red/amber accent badge if count > 0
   - "View All" button that calls `onNavigate('rfis')`
   - If count is 0, show "No open RFIs" muted text

### Grid Layout Adjustment

The current grid is `grid-cols-1 sm:grid-cols-2` with 4 tiles (2x2). Adding a 5th tile means the last row will have 1 tile on `sm`. No layout change needed -- the existing responsive grid handles this naturally. Alternatively, the RFI tile can span the full width on the last row for visual balance using `sm:col-span-2` only when it is the 5th item.

### No Other Files Changed

This is a self-contained addition to `OperationalSummary.tsx`. The `project_rfis` table and RLS policies already exist from the previous RFI implementation.

## Technical Details

```text
Query:
  supabase
    .from('project_rfis')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'OPEN')

Result: count number used for badge display
```

The tile will show:
- Count > 0: amber badge with count, e.g. "3 Open"
- Count = 0: muted "No open RFIs" text
