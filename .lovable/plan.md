

# Show Active Work Orders to FC for Billing Visibility

## Problem
The FC home screen only shows work orders in two narrow buckets:
- "Open COs requiring your input" — only `active` collaborator + draft/shared/wip/closed_for_pricing
- "Approved / Billable" — only `completed` collaborator + approved/contracted

Work orders where the FC is an active collaborator but already submitted (or in other active states) fall through the cracks. The FC can't see them and therefore can't track or bill them.

## Fix
Add a new section **"Active Work Orders"** between "Open COs requiring your input" and "My Change Orders" that shows all work orders where:
- FC is a collaborator (`collaboratorOrgId === orgId`)
- Collaborator status is `active` or `completed`
- WO status is `submitted`, `work_in_progress`, `shared`, `closed_for_pricing`, `approved`, or `contracted`
- Exclude ones already shown in the "requiring input" section

This gives the FC full visibility into all work orders they're involved in.

## Changes
**`src/components/change-orders/FCHomeScreen.tsx`**
- Add an `activeCOs` filter that captures WOs where FC is collaborator with `active` or `completed` status, excluding the ones already in `actionableCOs`
- Render a new "Active Work Orders" card list section with the same card style
- Update the `billableCOs` section to remain as-is (or merge into active — keeping it separate for clarity)

