

# Show Setup Projects First on Dashboard

## What
Change the default status filter on the dashboard from "Active" to "Setup" when there are projects in setup status, so users see their incomplete projects first.

## Changes

### `src/pages/Dashboard.tsx`
- Change the initial `statusFilter` state to be dynamic: default to `'setup'` if `statusCounts.setup > 0`, otherwise `'active'`
- Use a `useEffect` to set the filter to `'setup'` once data loads and there are setup projects (since `statusCounts` isn't available at mount time)

**1 file modified.**

