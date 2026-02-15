

# Move Estimate Approval to Project Page + Enable TC Approval

## Problem Summary
Three issues with the current estimate approval flow:
1. Only GC_PM can approve estimates -- but when TC has material responsibility, TC should be the approver
2. GC can see estimate totals even when they are not the material-responsible party
3. Estimate approval lives on a standalone page (/approvals/estimates) instead of being part of the project page where it logically belongs

## Changes

### 1. Create a new `ProjectEstimatesReview` component
**New file: `src/components/project/ProjectEstimatesReview.tsx`**

A project-scoped estimates panel that:
- Shows all submitted/approved/rejected supplier estimates for the project
- Shows approve/reject buttons only to the **material-responsible party** (GC or TC, based on `material_responsibility` on the project contract)
- Hides estimate totals from non-responsible parties
- Includes a detail view with line items (same layout as current EstimateApprovals page)
- Includes the reject dialog with reason

The component accepts `projectId` and determines the viewer's permission by:
1. Querying `project_contracts` for the row where `material_responsibility` is set
2. Checking if the current user's org matches the responsible org (GC side = `to_org_id`, TC side = `from_org_id`)
3. If match, show approve/reject actions and pricing; otherwise show read-only list without pricing

### 2. Add "Estimates" tab to ProjectTopBar for GC and TC
**File: `src/components/project/ProjectTopBar.tsx`**

Currently the "Estimates" tab only shows for suppliers. Add it for GC and TC as well (it already exists for suppliers). The tab label stays "Estimates".

### 3. Wire up the Estimates tab in ProjectHome for non-suppliers
**File: `src/pages/ProjectHome.tsx`**

Currently `activeTab === 'estimates'` only renders `SupplierEstimatesSection` for suppliers. Add a branch for non-suppliers that renders the new `ProjectEstimatesReview` component.

### 4. Update EstimateApprovals page to support both GC and TC
**File: `src/pages/EstimateApprovals.tsx`**

- Remove the `GC_PM`-only gate -- allow both `GC_PM` and `TC_PM`
- Filter estimates to only show those where the user's org is the material-responsible party
- Hide estimate totals from non-responsible viewers
- Keep this page as a cross-project overview (all projects), but the primary approval flow moves to the project page

### 5. Add "Estimate Approvals" sidebar link for TC_PM
**File: `src/components/layout/AppSidebar.tsx`**

Currently `gcNavItems` includes Estimate Approvals only for GC. Add it for TC_PM as well (or make it role-aware based on material responsibility).

### 6. Update approval logic to check material responsibility
**File: `src/pages/EstimateApprovals.tsx`** and new component

When approving, the `material_estimate_total` update already targets the material-responsible contract. The key change is **who is allowed to approve**: only the org that owns material responsibility for that project's contract.

## Technical Details

### Files Created
- **`src/components/project/ProjectEstimatesReview.tsx`** -- New component for project-level estimate review with approve/reject for the material-responsible party

### Files Modified
- **`src/components/project/ProjectTopBar.tsx`** -- Show "Estimates" tab for GC and TC (not just suppliers)
- **`src/pages/ProjectHome.tsx`** -- Render `ProjectEstimatesReview` for non-suppliers on the estimates tab
- **`src/pages/EstimateApprovals.tsx`** -- Allow TC_PM access, filter by material responsibility
- **`src/components/layout/AppSidebar.tsx`** -- Show Estimate Approvals link for TC_PM
- **`src/components/project/index.ts`** -- Export new component

### Permission Logic

```text
Who can approve estimates for a project?
  1. Query project_contracts WHERE material_responsibility IS NOT NULL
  2. If material_responsibility = 'GC' --> to_org_id is the approver org
  3. If material_responsibility = 'TC' --> from_org_id is the approver org
  4. Compare approver org against current user's org IDs
  5. If match --> show approve/reject buttons + pricing
  6. If no match --> read-only view, no pricing shown
```

### Flow After Changes

```text
GC/TC opens project page --> clicks "Estimates" tab
  --> Sees list of supplier estimates for this project
  --> If material-responsible: sees pricing, approve/reject buttons
  --> If not responsible: sees estimate names/status only (read-only)
  --> Approve --> updates status + aggregates total to material_estimate_total
  --> Reject --> prompts for reason, updates status
```
