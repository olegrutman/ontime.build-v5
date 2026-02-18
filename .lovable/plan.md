
# Hide Project Setup Card for Field Crew Users

## What Changes

The Project Readiness Card will no longer appear for Field Crew (FC) users on the project overview. FC users are only responsible for accepting the project invite -- once the SOV is activated for them, it becomes an active project. The setup completion checklist is only relevant for GC and TC roles.

## Technical Changes

### `src/pages/ProjectHome.tsx`

- Add an `isFC` flag alongside the existing `isSupplier` flag:
  ```
  const isFC = currentOrg?.type === 'FC';
  ```
- Update the readiness card conditional (around line 197) to also exclude FC:
  ```
  {(project.status === 'setup' || project.status === 'draft') && !isFC && (
    <ProjectReadinessCard readiness={readiness} />
  )}
  ```
- Optionally skip the `useProjectReadiness` hook call for FC users to avoid unnecessary database queries, or leave it since it's harmless.

### No other file changes needed

The readiness hook and card component remain unchanged -- this is purely a visibility change on the page level.
