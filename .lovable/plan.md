

# Fix: GC Can't See TC-Created Work Orders

## Root Cause

When TC creates a WO, the wizard resolves `assigned_to_org_id` from `projects.organization_id`. But this project was **created by TC**, so `projects.organization_id` = TC's own org (`ab07e031`). The WO gets assigned back to TC instead of the upstream GC.

DB evidence:
- `projects.organization_id` = `ab07e031` (TC org)
- CO `assigned_to_org_id` = `ab07e031` (TC org — wrong, should be GC)
- GC org = `96a802b8` (exists as participant with role GC)
- No `project_contracts` exist, so the downstream fallback in `useChangeOrders` also fails

GC visibility checks all return false:
- `isMine`: co.org_id is TC, not GC
- `isAssigned`: assigned_to_org_id is TC, not GC
- `isCollaborator`: no collaborator record for GC
- `isDownstream`: no contracts → empty set

## Fix (2 parts)

### 1. Fix `assigned_to_org_id` resolution in wizards

**`src/components/change-orders/wizard/TMWOWizard.tsx`** (line ~224-226)
**`src/components/change-orders/wizard/COWizard.tsx`** (line ~245-247)

Current logic for TC:
```typescript
const { data: proj } = await supabase.from('projects').select('organization_id').eq('id', projectId).single();
resolvedAssignedToOrgId = proj?.organization_id ?? null;
```

New logic: First try to find the GC org from `project_participants`, falling back to `projects.organization_id`:
```typescript
// For TC: find the GC on this project to assign to
const { data: gcParticipant } = await supabase
  .from('project_participants')
  .select('organization_id')
  .eq('project_id', projectId)
  .eq('role', 'GC')
  .eq('invite_status', 'ACCEPTED')
  .limit(1)
  .maybeSingle();

if (gcParticipant?.organization_id) {
  resolvedAssignedToOrgId = gcParticipant.organization_id;
} else {
  // Fallback: project owner
  const { data: proj } = await supabase.from('projects').select('organization_id').eq('id', projectId).single();
  resolvedAssignedToOrgId = proj?.organization_id ?? null;
}
```

### 2. Add GC participant fallback in `useChangeOrders.ts`

Even with the wizard fix, existing COs still have wrong `assigned_to_org_id`. Add a participant-role-based visibility check so GC sees all COs on projects where they're a GC participant.

**`src/hooks/useChangeOrders.ts`** (line ~89-98)

After the downstream contracts query, also fetch current org's participant role:
```typescript
const { data: myParticipant } = await supabase
  .from('project_participants')
  .select('role')
  .eq('project_id', projectId!)
  .eq('organization_id', orgId!)
  .eq('invite_status', 'ACCEPTED')
  .maybeSingle();
const isGCOnProject = myParticipant?.role === 'GC';
```

Then in the grouping logic (line ~133), add GC sees all non-own COs:
```typescript
} else if (
  (co.assigned_to_org_id === orgId && co.org_id !== orgId) ||
  isCollaborator ||
  isDownstream ||
  isGCOnProject  // GC sees all COs on their projects
) {
  grouped.sharedWithMe.push(co);
}
```

Same addition in the board columns loop (line ~152).

### Summary
Three files, two changes each in the wizards + one visibility fix in the hook. Future WOs will correctly target GC, and existing ones become visible via the participant fallback.

