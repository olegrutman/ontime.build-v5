
Hide SOV, Schedule, and Daily Log from the project icon rail for SUPPLIER orgs only.

Looking at `src/components/project/ProjectIconRail.tsx`, the rail already has `hideForSupplier` support but it's not set on those three items. Need to:

1. Add `hideForSupplier: true` to:
   - `sov` (Schedule of Values) in GROUP_1
   - `schedule` in GROUP_4
   - `daily-log` in GROUP_4

2. Verify `isSupplier` is being passed correctly from the parent (ProjectShell or wherever rail is rendered).

Also need to check if there's a separate mobile tab bar (`ProjectTabBar`) that needs the same treatment for consistency.

## Files Modified
1. `src/components/project/ProjectIconRail.tsx` — add `hideForSupplier: true` to sov, schedule, daily-log items
2. `src/components/project/ProjectTabBar.tsx` (if it lists these items) — same hide rule for supplier

No changes to routes, permissions, data, or desktop behavior for non-supplier roles.
