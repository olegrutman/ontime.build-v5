

# Fix: Project Status Not Syncing After Auto-Activation

## Problem

When `useProjectReadiness` auto-activates a project (updates DB status to 'active'), the `project` state in `ProjectHome` is not refreshed. This causes:
- **Readiness card** shows "Project is active and ready for execution" (correct, uses its own `isActive` state)
- **PO/WO/Invoice tabs** still show "Project Setup Incomplete" banner (stale `project.status` = 'setup')

The TC sees conflicting messages: the project appears ready but they can't create POs.

## Root Cause

`ProjectHome` fetches the project once on mount (line 189-196). When `useProjectReadiness` auto-activates by writing `status: 'active'` to the DB, the local `project` state is never updated.

## Fix

### `src/pages/ProjectHome.tsx`

When `readiness.isActive` becomes true and the local project status is still 'setup', update the local project state to reflect the activation:

Add an effect after the readiness hook (around line 132):

```typescript
useEffect(() => {
  if (readiness.isActive && project && project.status !== 'active') {
    setProject({ ...project, status: 'active' });
  }
}, [readiness.isActive, project]);
```

This syncs the local state immediately when auto-activation completes, removing the "Project Setup Incomplete" banner from all tabs without requiring a page refresh.

