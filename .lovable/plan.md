

# Bug Fixes & Design Consistency — Details Wizard, Scope Wizard, SOV Page

## Bugs Found

### Bug 1: 404 on close button (Details Wizard)
**Root cause**: `ProjectDetailsWizard.tsx` line 450 navigates to `/projects/${projectId}` (plural) but the route is `/project/:id` (singular). This is the 404 shown in the session replay.

### Bug 2: Scope Wizard has no close/exit button
The Scope Wizard (`ProjectScopeWizard.tsx`) has no X button or way to exit back to the project overview without going through "Back to Profile" or "Save & Continue". Users are trapped.

### Bug 3: Contracts page has no close/exit button
Same issue — `ProjectContractsPage.tsx` only allows going back to scope wizard or saving. No way to get to the project overview directly.

### Bug 4: Details & Scope wizards don't use AppLayout
The SOV page properly uses `AppSidebar` + `SidebarInset` + `BottomNav` (matching the app's standard layout), but the Details Wizard, Scope Wizard, and Contracts page are raw full-screen pages with no sidebar or bottom nav. This breaks navigation consistency — users lose access to all sidebar links.

### Bug 5: Contracts page — no "back to overview" option after saving
After saving contracts, user navigates to `/project/${projectId}` but there's no breadcrumb or easy way to get back from the contracts page to the project overview without saving.

### Bug 6: SOV scope coverage query uses items as query key dependency
`useSOVPage.ts` line 81: `queryKey: ['sov-scope-coverage', projectId, items]` — using the entire `items` array as a query key causes the query to re-run on every render since `items` is a new array reference each time. Should use `currentSOV?.id` or `items.length`.

## Design Inconsistencies

### Issue 1: No consistent layout wrapper
Details Wizard, Scope Wizard, and Contracts pages render without the app shell (sidebar, bottom nav, topbar). Every other project page uses the app layout. These should either use the full AppLayout or at minimum have a consistent sticky back-to-overview bar.

### Issue 2: Font usage not consistent
Headings use `font-[Barlow_Condensed]` inline class but the SOV page uses `font-heading` (the Tailwind utility). Should standardize.

## Fix Plan

### File: `src/pages/ProjectDetailsWizard.tsx`
- **Line 450**: Fix `/projects/${projectId}` → `/project/${projectId}` (the 404 bug)

### File: `src/pages/ProjectScopeWizard.tsx`
- Add X close button in the sticky header bar (next to "Edit Profile") that navigates to `/project/${projectId}?tab=scope-details`

### File: `src/pages/ProjectContractsPage.tsx`
- Add X close button in the sticky header that navigates to `/project/${projectId}?tab=scope-details`

### File: `src/hooks/useSOVPage.ts`
- **Line 81**: Change query key from `['sov-scope-coverage', projectId, items]` to `['sov-scope-coverage', projectId, currentSOV?.id, items.length]` to prevent unnecessary re-fetches

### Font standardization
- In Details Wizard, Scope Wizard, Contracts: replace `font-[Barlow_Condensed]` with `font-heading` to match the design system token used elsewhere

## Files Changed

| File | Change |
|------|--------|
| `src/pages/ProjectDetailsWizard.tsx` | Fix 404 route (`/projects/` → `/project/`), fix font class |
| `src/pages/ProjectScopeWizard.tsx` | Add close/X button, fix font class |
| `src/pages/ProjectContractsPage.tsx` | Add close/X button, fix font class |
| `src/hooks/useSOVPage.ts` | Fix scope coverage query key |

