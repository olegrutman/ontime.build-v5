

# Allow Project Creator to Edit Schedule

## Problem
Currently, only the highest upstream organization can edit the schedule. The project creator should also have edit access regardless of their org's position in the chain.

## Solution
Update `useScheduleOwnership` to also fetch the project's `created_by` field and grant `canEditSchedule` if the current user is the project creator.

## Changes

| File | Change |
|------|--------|
| `src/hooks/useScheduleOwnership.ts` | Fetch `projects.created_by` alongside `project_team`. Grant `canEditSchedule = true` if `user.id === project.created_by` OR if user's org is the highest upstream org. |

**Updated logic:**
```typescript
// Fetch project creator in parallel with team
const [teamResult, projectResult] = await Promise.all([
  supabase.from('project_team').select('role, org_id').eq('project_id', projectId),
  supabase.from('projects').select('created_by').eq('id', projectId).single(),
]);

// ...existing ownership logic...

const isCreator = user?.id === projectResult.data?.created_by;
const canEditSchedule = isCreator || (ownerOrgId ? userOrgIds.includes(ownerOrgId) : false);
```

