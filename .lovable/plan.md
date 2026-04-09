

# Project Info Page: Show Project Summary, Remove Old Links

## What Changes

### 1. Simplify `ProjectSetupFlow` — summary only
Replace the current `ProjectSetupFlow` component to just render `ProjectInfoSummary`. Remove:
- The setup wizard card (lines 77-91)
- The SOV editor card (lines 93-130)
- All related state, callbacks, and queries (`sovExists`, `setupAnswerCount`, `handleSetupComplete`, `handleSOVComplete`)

The component becomes a simple wrapper that renders `<ProjectInfoSummary projectId={projectId} />`.

### 2. Remove "Edit" links from `ScopeDetailsTab`
In `ScopeDetailsTab.tsx`, remove the "Edit" buttons on the Project Profile card (line 223-225) and Scope Summary card (line 287-289) that navigate to `/project/:id/setup`. These are the "old links" pointing back to the setup wizard.

### Files Changed

| File | Change |
|------|--------|
| `src/components/project-setup/ProjectSetupFlow.tsx` | Strip down to just render `ProjectInfoSummary` |
| `src/components/project/ScopeDetailsTab.tsx` | Remove "Edit" buttons that link to setup |

