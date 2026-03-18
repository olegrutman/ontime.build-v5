
Goal: remove “Work Orders” from the project sticky navigation so users no longer see that tab.

What I found
- Desktop sticky project bar: `src/components/project/ProjectTopBar.tsx`
  - It still renders a `TabsTrigger` for `work-orders`.
- Mobile/tablet bottom nav: `src/components/layout/BottomNav.tsx`
  - It still includes a `WOs` item in `primaryProjectItems`.
- Project page content: `src/pages/ProjectHome.tsx`
  - There is no rendered `work-orders` tab content anymore, so the nav item is stale.
- The current route is `/project/...?...tab=work-orders`, so removing only the button would leave users stranded on an inactive tab unless we add a fallback.

Implementation plan
1. Remove the desktop sticky-bar tab
- Delete the `work-orders` tab button from `ProjectTopBar.tsx`.
- Keep `Change Orders` and the other project tabs unchanged.

2. Remove the mobile bottom-nav item
- Delete the `WOs` item from `primaryProjectItems` in `BottomNav.tsx`.
- Keep the rest of the mobile nav structure intact.

3. Add a safe tab fallback
- In `ProjectHome.tsx`, if `activeTab === 'work-orders'`, automatically redirect to a valid tab.
- Recommended fallback: `change-orders` if that feature is enabled, otherwise `overview`.
- This prevents blank/inert UI for any saved links, old bookmarks, Sasha navigation, or existing sessions already on `?tab=work-orders`.

4. Quick cleanup check
- Verify there are no remaining user-facing “work-orders” navigation references in project-page navigation components.
- Leave unrelated references alone unless they create broken navigation in the project UI.

Technical details
- Files to update:
  - `src/components/project/ProjectTopBar.tsx`
  - `src/components/layout/BottomNav.tsx`
  - `src/pages/ProjectHome.tsx`
- No backend or database changes required.
- I would not touch the earlier build/dependency issue as part of this request unless you want that fixed too; it appears separate from removing this tab.

Expected outcome
- “Work Orders” disappears from the sticky project bar.
- It also disappears from the mobile bottom nav.
- Any old `?tab=work-orders` links gracefully land on a valid tab instead of showing an empty state.
