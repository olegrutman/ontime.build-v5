

# Fix: Partner Directory Not Showing Any Partners

## Problem

The Partner Directory shows no organizations or people because the code filters by `status = 'active'`, but the actual database values use `status = 'Accepted'`. This causes both queries to return zero results, so the entire directory appears empty for all users.

## Database Evidence

All rows in `project_team` have `status = 'Accepted'`. The data is correct -- for example, the project "Main Street Apartments #33" has:
- GC: John Smith (GC_Test)
- TC: Mike Gold (TC_Test)  
- FC: Tim Cook (FC_Test)
- Supplier: Greg Moon (Supplier_Test)

None of these appear because the filter never matches.

## Fix

Update two lines in `src/hooks/usePartnerDirectory.ts`:

**Line 62** -- First query (find current user's projects):
```
Before: .eq('status', 'active')
After:  .eq('status', 'Accepted')
```

**Line 97** -- Second query (find other team members on those projects):
```
Before: .eq('status', 'active')
After:  .eq('status', 'Accepted')
```

## Impact

- Both the Organizations tab and People tab will populate correctly
- GC users will see TCs, FCs, and Suppliers they've collaborated with
- All users will see their cross-org partners grouped and sorted properly
- No database changes needed -- the data is already correct

## Files Changed

| File | Change |
|---|---|
| `src/hooks/usePartnerDirectory.ts` | Change `'active'` to `'Accepted'` in two `.eq('status', ...)` filters (lines 62 and 97) |

