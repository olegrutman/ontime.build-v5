

# Schedule Ownership: Highest Upstream User Controls Schedule

## Problem
Currently any project member can edit the schedule and generate tasks. The business rule is: **only the highest upstream organization** in the project chain should own/edit the schedule. The hierarchy is GC > TC > FC. If a GC is on the project, they own the schedule. If no GC exists, TC owns it. Additionally, users need the ability to **delete all schedule items and regenerate** from SOV.

## Solution

### 1. Create a hook: `useScheduleOwnership(projectId)`
Query `project_team` for the current project to determine which roles exist. Determine the "owner role" (GC if present, else TC). Compare against the current user's org to determine if they `canEditSchedule`.

```typescript
// src/hooks/useScheduleOwnership.ts
export function useScheduleOwnership(projectId: string) {
  // Query project_team roles for this project
  // Determine highest upstream: GC > TC > FC
  // Check if current user's org matches the owner org
  // Return { canEditSchedule, ownerRole, isLoading }
}
```

**Logic:**
- Fetch all `project_team` rows for the project with `role` and `org_id`
- Priority: if any row has `role = 'General Contractor'`, that org owns schedule
- Else if any row has `role = 'Trade Contractor'`, that org owns it
- Compare owner `org_id` against the user's current organization (from `useAuth().userOrgRoles`)
- Return `canEditSchedule: boolean`

### 2. Gate schedule editing in `ScheduleTab.tsx`
- Import `useScheduleOwnership`
- Hide add/edit/delete buttons and auto-estimate when `!canEditSchedule`
- Disable drag interactions on GanttChart when `!canEditSchedule`
- Show a subtle banner: "Schedule managed by [Owner Role]" for non-owners

### 3. Add "Clear & Regenerate" functionality
- Add a "Regenerate from SOV" button (visible only to schedule owner)
- On click, show confirmation dialog
- Delete all existing `project_schedule_items` for the project
- Re-trigger task generation by fetching TC→GC SOV items and inserting new schedule items (replicating the trigger logic client-side, since the DB trigger only fires on SOV item insert)

### 4. Pass `readOnly` prop to sub-components
- `TaskDetailDrawer`: disable all inputs when `readOnly`
- `GanttChart`: disable drag when `readOnly`
- `MobileScheduleView`: hide duration adjustment buttons when `readOnly`

## Files

| File | Change |
|------|--------|
| `src/hooks/useScheduleOwnership.ts` | **New** — determines if current user's org is the highest upstream on the project |
| `src/components/schedule/ScheduleTab.tsx` | Use `useScheduleOwnership` to gate all edit actions; add "Clear & Regenerate" button with confirmation |
| `src/components/schedule/TaskDetailDrawer.tsx` | Accept `readOnly` prop, disable inputs when true |
| `src/components/schedule/GanttChart.tsx` | Accept `readOnly` prop, disable drag when true |
| `src/components/schedule/MobileScheduleView.tsx` | Accept `readOnly` prop, hide edit controls when true |

