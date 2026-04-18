

Remove the "Purchase Orders" nav item from the dashboard sidebar.

### Change
In `src/components/app-shell/DashboardSidebar.tsx`, delete this entry from `NAV_ITEMS` (line ~22):
```ts
{ label: 'Purchase Orders', icon: Package, path: '/purchase-orders' },
```
Also drop the now-unused `Package` import from the lucide-react import block.

### Files modified
- `src/components/app-shell/DashboardSidebar.tsx` — remove one nav item + unused icon import

### Files NOT touched
- `/purchase-orders` route itself remains accessible (still reachable from project pages and direct URL).
- Mobile/bottom nav, project sidebar — not affected.

### Verification
- Dashboard sidebar shows: Dashboard, Partners, Reminders, My Team, Settings.
- No "Purchase Orders" entry.
- No console warnings for unused imports.

