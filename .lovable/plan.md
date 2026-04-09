

# Show Company and Member Name in Team Card

## Problem
The Team card in GC Project Overview only shows the company name (`invited_org_name`). It doesn't show the individual member's name (`invited_name`).

## Fix

### `src/components/project/GCProjectOverviewContent.tsx`

1. **Add `invited_name` to the query** (line 313):
   - Change select from `'id, role, invited_org_name, status'` to `'id, role, invited_org_name, invited_name, status'`

2. **Show member name below company name** (lines 544-548):
   - Keep company name as the primary line
   - Add a second line showing the member's name in smaller, muted text when `invited_name` is present

The rendering for each team member will change from:
```
● TC  Acme Construction
```
To:
```
● TC  Acme Construction
         John Smith
```

| File | Change |
|------|--------|
| `src/components/project/GCProjectOverviewContent.tsx` | Add `invited_name` to query; show member name below company name |

