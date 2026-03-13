

# Allow Platform Owner to Delete Projects Completely

## What needs to happen

Add a "Delete Project" action to the Platform Project Detail page, restricted to Platform Owners only. The action requires a reason (audit logged), shows a confirmation dialog, and performs a full cascading deletion via the edge function.

## Database constraint issue

Two tables will block or orphan data on project deletion:
- **`supplier_estimates`**: FK with `NO ACTION` — will **block** the DELETE
- **`purchase_orders`**: FK with `SET NULL` — won't block but orphans PO rows

**Fix via migration**: Change both FKs to `CASCADE` so deleting a project cleans up everything.

## Changes

### 1. Database migration
Drop and re-add the foreign key constraints:
```sql
ALTER TABLE supplier_estimates DROP CONSTRAINT supplier_estimates_project_id_fkey;
ALTER TABLE supplier_estimates ADD CONSTRAINT supplier_estimates_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_project_id_fkey;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
```

### 2. Edge function: add `DELETE_PROJECT` action (`supabase/functions/platform-support-action/index.ts`)
- Add `DELETE_PROJECT: "PLATFORM_OWNER"` to `ACTION_MIN_ROLE`
- Add a new case that:
  1. Snapshots the project name, status, created_by
  2. Deletes notifications referencing this project
  3. Deletes the project row (FKs cascade everything else)
  4. Logs the action with project name in summary

### 3. Type update (`src/types/platform.ts`)
- Add `'DELETE_PROJECT'` to `SupportActionType` union
- Add label in `ACTION_TYPE_LABELS`: `'Project Deleted'`

### 4. UI: Delete button on Project Detail page (`src/pages/platform/PlatformProjectDetail.tsx`)
- Add a red "Delete Project" button in the summary card header area
- Wire it to a `SupportActionDialog` with destructive warning text
- On confirm, call `execute({ action_type: 'DELETE_PROJECT', reason, project_id })` then navigate back to `/platform/projects`
- Only show for Platform Owners (check `platformRole` from `useAuth`)

## Files to change
| File | Change |
|---|---|
| Migration SQL | Fix FK constraints on `supplier_estimates` and `purchase_orders` |
| `supabase/functions/platform-support-action/index.ts` | Add `DELETE_PROJECT` handler |
| `src/types/platform.ts` | Add type + label |
| `src/pages/platform/PlatformProjectDetail.tsx` | Add delete button + dialog |

