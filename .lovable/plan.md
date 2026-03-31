

# Remove Standalone Framing Scope Tab

## Why
The Framing Scope wizard is already embedded inside the Project Setup tab (step 2 of the stepper). The standalone "Framing Scope" tab in the icon rail is redundant — it shows the exact same `FramingScopeWizard` component.

## Changes

### 1. `src/components/project/ProjectIconRail.tsx`
- Remove the `{ key: 'scope', label: 'Framing Scope', icon: ClipboardList, route: 'scope' }` entry from the nav items array

### 2. `src/pages/ProjectHome.tsx`
- Remove the `(activeTab === 'scope' || activeTab === 'scope-details')` block (lines 371-383) that renders the standalone `FramingScopeWizard`
- Remove the `FramingScopeWizard` import if no longer used elsewhere in this file

### 3. `src/App.tsx`
- Remove or redirect any `/project/:id/scope` route if it exists (the `/projects/:id/scope` route points to `EditProjectScope` which is a different page — verify if that's also redundant)

## Files NOT Changed
- `FramingScopeWizard` component itself — stays, used by `ProjectSetupFlow`
- Database, hooks, types — untouched

