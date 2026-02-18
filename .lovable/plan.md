

# Make All Project Team Members See (and Interact with) Every RFI

## Current State

- **SELECT policy** (viewing): Already uses `has_project_access(auth.uid(), project_id)` -- all project team members can view all RFIs. No change needed here.
- **UPDATE policy** (answering/closing): Currently restricted to users whose org is either the `assigned_to_org_id` or `submitted_by_org_id`. This means other team members (e.g., a GC viewing a TC-to-Supplier RFI) cannot answer or close it.

## Proposed Change

Broaden the UPDATE RLS policy so that any project team member can update an RFI (answer it or close it), not just the assigned/submitting org.

### Database Migration

Drop the existing restrictive UPDATE policy and replace it with one that mirrors the SELECT policy:

```sql
DROP POLICY "Assigned or submitting org can update RFIs" ON project_rfis;

CREATE POLICY "Project team members can update RFIs"
  ON project_rfis
  FOR UPDATE
  USING (has_project_access(auth.uid(), project_id));
```

### Frontend Change

In `src/components/rfi/RFIDetailDialog.tsx`, update the `canAnswer` and `canClose` guards so any team member can answer an open RFI or close an answered one (not just the assigned/submitting org):

```
// Before:
const canAnswer = currentOrgId === rfi.assigned_to_org_id && rfi.status === 'OPEN';
const canClose = rfi.status === 'ANSWERED' && (currentOrgId === rfi.submitted_by_org_id);

// After:
const canAnswer = rfi.status === 'OPEN';
const canClose = rfi.status === 'ANSWERED';
```

## Files Affected

- **Database**: 1 migration (replace UPDATE RLS policy on `project_rfis`)
- **`src/components/rfi/RFIDetailDialog.tsx`**: Update `canAnswer` and `canClose` logic (2 lines)

## What This Achieves

- All project team members can view, answer, and close any RFI on the project
- The 5-step creation wizard remains unchanged (only users with `canCreateRFIs` permission can create)
