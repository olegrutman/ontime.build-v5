

# Bug: Accepted Projects Not Showing on Supplier Dashboard

## Root Cause

The "My Projects" section (`SupplierProjectList`) is fed from the `projectHealth` array, which is built exclusively from PO data and then filtered to only include projects where `deliveredTotal > 0 || exposure > 0` (line 464 of the hook).

The supplier's accepted project has 2 POs both in SUBMITTED status -- no DELIVERED POs exist yet. So the project gets filtered out and the list shows "No projects yet" even though the supplier has an accepted project with active POs.

## Fix

Decouple the project list from `projectHealth`. Instead, fetch accepted projects directly from `project_participants` where `organization_id = orgId` and `invite_status = 'ACCEPTED'`, then join to `projects` for names. This ensures all accepted projects appear regardless of PO/delivery status.

### Changes

| File | Change |
|---|---|
| `src/hooks/useSupplierDashboardData.ts` | Add a new `acceptedProjects` fetch from `project_participants` joined with `projects`. Add new type + state. Remove the `projectHealth` filter on line 464. |
| `src/components/dashboard/supplier/SupplierProjectList.tsx` | Update to use the new accepted projects data instead of `projectHealth` rows. Show project name, GC name, and PO count/total if available. |
| `src/components/dashboard/SupplierDashboard.tsx` | Pass the new `acceptedProjects` data to `SupplierProjectList` instead of `projectHealth`. |

### Data Fetch Addition (in the hook)

```typescript
// Fetch accepted projects for this org
const { data: acceptedProjectsData } = await supabase
  .from('project_participants')
  .select('project_id, role, projects:project_id(name, organization_id, organizations:organization_id(name))')
  .eq('organization_id', orgId)
  .eq('invite_status', 'ACCEPTED');
```

This replaces the reliance on `projectHealth` for the project list, ensuring every accepted project appears even if no POs or deliveries exist yet.

