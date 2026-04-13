

# Fix: FC-Created Change Orders Not Visible to TC

## The Bug

When a Field Crew (FC) creates a Change Order, the CO shows up on the GC's page but not the TC's page.

**Root cause:** When FC creates a CO, the wizard sets `assigned_to_org_id` to the **project's organization** (the GC), because it does `projects.organization_id`. But the TC is the FC's direct upstream — the TC hired the FC, not the GC. So the TC never matches any visibility condition:

- `co.org_id === tcOrgId` — false, it's FC's org
- `co.assigned_to_org_id === tcOrgId` — false, it's GC's org
- `isCollaborator` — false, TC isn't added as collaborator

The GC sees it because `assigned_to_org_id` happens to be the GC's org.

## The Fix

**File: `src/components/change-orders/wizard/COWizard.tsx`** (~10 lines changed)

In the auto-resolve block (line 240-243), when `role === 'FC'`, look up the FC's upstream contract (`project_contracts` where `from_org_id = FC org`) to find the TC's org (`to_org_id`), and set `assigned_to_org_id` to the TC — not the project owner.

```
if (role === 'FC') {
  // Find FC's upstream contract to get TC org
  const { data: fcContract } = await supabase
    .from('project_contracts')
    .select('to_org_id')
    .eq('project_id', projectId)
    .eq('from_org_id', orgId)
    .single();
  resolvedAssignedToOrgId = fcContract?.to_org_id ?? proj?.organization_id ?? null;
}
```

**File: `src/hooks/useChangeOrders.ts`** (~5 lines changed)

Additionally, the visibility logic in the grouping loop should also account for the TC seeing COs where the FC (a downstream sub) created the CO. Add a check: if the CO's `org_id` belongs to an org that has a contract with `to_org_id = tcOrgId` on this project, the TC should see it. However, this requires an extra query. A simpler approach: also check if the current org is the `assigned_to_org_id` of the CO (which the wizard fix above now correctly sets to TC).

The current condition `(co.assigned_to_org_id === orgId && co.org_id !== orgId)` already handles this — the wizard fix alone should be sufficient for new COs. For existing FC-created COs with wrong `assigned_to_org_id`, we can add a fallback check using contract data.

## Plain English

When your field crew creates a change order, the system was accidentally sending it to the GC instead of to you (the TC who hired them). The fix makes it so FC change orders get routed to the TC — their direct boss — not the project owner.

## Files Changed
- `src/components/change-orders/wizard/COWizard.tsx` — fix FC org resolution to use upstream contract

