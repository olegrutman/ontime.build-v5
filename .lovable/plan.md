

# Eliminate Redundant Wizards — Single Unified Flow

## Problem
Three separate wizards exist with overlapping questions:
1. **ProjectDetailsWizard** (889 lines, 10 steps) — building profile + scope toggles
2. **ProjectScopeWizard** — old generic on/off scope toggles
3. **FramingScopeWizard** — the new 11-section wizard that already covers everything

"Define Scope & Details" on the overview page sends users to Wizard #1, which then chains to Wizard #2. Both are now redundant because the **ProjectSetupFlow** (PhaseBuilding + FramingScopeWizard) already handles all of this better.

## Solution
Remove the two old wizards from routing and redirect all entry points to the unified **ProjectSetupFlow** (the `setup` tab).

## Changes

### 1. Update entry points to point to setup flow
**`src/pages/ProjectHome.tsx`** — Change the "Define Scope & Details" banner from navigating to `/project/:id/details-wizard` to switching to the `setup` tab directly (or navigating to `/project/:id/setup` if preferred).

**`src/components/project/ScopeDetailsTab.tsx`** — Change "Edit Profile" and "Edit Scope" buttons to navigate to the setup flow instead of the old wizards.

### 2. Remove old wizard routes from App.tsx
**`src/App.tsx`** — Remove the routes for `/project/:id/details-wizard` and `/project/:id/scope-wizard`. Add redirects so any bookmarked URLs go to the setup flow.

### 3. Remove old contracts page back-nav references
**`src/pages/ProjectContractsPage.tsx`** — Update "Back to Scope" navigation to point to the setup flow instead of `/scope-wizard`.

### 4. Keep old files but stop routing to them
`ProjectDetailsWizard.tsx` and `ProjectScopeWizard.tsx` remain in the codebase (safe cleanup later) but are no longer reachable via routes.

## Files Modified
- `src/App.tsx` — remove/redirect old wizard routes
- `src/pages/ProjectHome.tsx` — "Define Scope & Details" → setup tab
- `src/components/project/ScopeDetailsTab.tsx` — edit buttons → setup flow
- `src/pages/ProjectContractsPage.tsx` — back navigation → setup flow

## Files NOT Changed
- ProjectSetupFlow, PhaseBuilding, FramingScopeWizard — already correct
- Database, hooks, types — untouched

