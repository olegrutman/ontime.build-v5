

# Persist Project Wizard Draft in sessionStorage

## Problem
All wizard state is held in React `useState`. If the user navigates away (e.g., clicks a notification, checks another page), everything they entered is gone.

## Solution
Save the wizard draft to `sessionStorage` on every change, and restore it when the component mounts. Session storage is ideal here — it persists across page navigations but clears when the browser tab is closed (so stale drafts don't linger).

## What gets saved
All wizard state under a single key `project_wizard_draft`:
- `basics` (name, address, city, state, zip, startDate)
- `team` (array of team members)
- `currentStep` (which step they're on)
- `contractMode` (fixed vs T&M)
- `tmScope` (T&M building info)
- `wizardAnswers` (scope answers from the setup wizard hook)
- `wizardBuildingType` (selected building type)

## How it works
1. On mount, check `sessionStorage` for `project_wizard_draft`. If found, restore all fields.
2. On every state change, debounce-write the combined state to `sessionStorage`.
3. On successful project creation, clear the stored draft.
4. The `useSetupWizardV2` hook needs a small addition: accept optional initial values for `answers` and `buildingType` so the page can seed them from the restored draft.

## Changes

### 1. `src/hooks/useSetupWizardV2.ts`
Add optional `initialAnswers` and `initialBuildingType` parameters to the hook so the wizard page can pass in restored draft values:
```ts
export function useSetupWizardV2(projectId?: string, initialAnswers?: Answers, initialBuildingType?: BuildingType | null)
```
Use these as `useState` defaults instead of `{}` and `null`.

### 2. `src/pages/CreateProjectNew.tsx`
- Add a `DRAFT_KEY = 'project_wizard_draft'` constant.
- On mount: read from `sessionStorage`, parse, and use values as initial state for `useState` calls and pass to `useSetupWizardV2`.
- Add a `useEffect` that writes all state to `sessionStorage` whenever any value changes (with a simple debounce via `setTimeout`).
- After successful `createProject()`, call `sessionStorage.removeItem(DRAFT_KEY)`.
- Expose wizard `answers` and `buildingType` to the effect via the hook's returned values.

### 3. No database changes needed

## Plain English
When you start filling out the wizard, your progress is automatically saved in your browser. If you leave the page and come back, everything you typed — project name, address, team members, scope answers — will still be there. Once you finish creating the project, the draft is cleared. If you close the tab entirely, the draft is also cleared (it doesn't follow you to other tabs or devices).

