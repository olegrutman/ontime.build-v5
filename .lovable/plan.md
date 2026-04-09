

# Fix: TC's Accepted Project Not Visible on Dashboard

## Problem
The TC accepted the project invitation, and all data is correctly stored (both `project_participants` and `project_team` have `ACCEPTED`/`Accepted` status). However, the project "Main House" has status **"completed"**, and the dashboard defaults to showing the **"Active"** tab. Since the TC has no active projects, they see an empty state.

## Fix

### `src/pages/Dashboard.tsx` (lines 61-68)

Update the auto-select logic so that when data loads, if there are no active or setup projects, it picks the first non-empty status tab:

```
Current logic:
  if setup > 0 → select "setup"
  else → stay on "active"

New logic:
  if active > 0 → stay on "active"
  else if setup > 0 → select "setup"
  else → pick first tab with count > 0 (completed, on_hold, archived)
```

This ensures the TC (or any user) lands on a tab that actually has projects, rather than seeing an empty "Active" tab when their only projects are in other statuses.

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Update auto-select logic to pick first non-empty status tab |

