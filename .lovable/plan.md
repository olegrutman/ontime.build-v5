

# Fix: "Define Scope & Details" Banner Showing on Active Projects

## Problem
The setup banner appears even after the project is finalized and active. The condition on line 142 only checks if profile/scope data exists, but doesn't account for the project's status.

## Root Cause
```tsx
const showSetupBanner = !projectProfile || !scopeSelections || scopeSelections.length === 0;
```
This ignores `project.status`. An active project with valid scope data might still show the banner if the query hasn't loaded yet, and more importantly, it should **never** show on active projects regardless.

## Fix

### `src/pages/ProjectHome.tsx` — line 142
Add a status check so the banner only shows on `setup`/`draft` projects:

```tsx
const showSetupBanner =
  (project.status === 'setup' || project.status === 'draft') &&
  (!projectProfile || !scopeSelections || scopeSelections.length === 0);
```

This ensures active projects never see the setup banner, and even draft/setup projects only see it when scope is genuinely missing.

## Files Modified
| File | Change |
|------|--------|
| `ProjectHome.tsx` | Add project status gate to `showSetupBanner` |

