

# CO Flow Bug Analysis and Fixes

## Bugs Found

### Bug 1: FCHomeScreen missing approved/completed COs section
`FCHomeScreen.tsx` has only two sections:
- "Open COs requiring your input" — filters to `collaboratorStatus === 'active'` AND status in `[shared, wip, closed_for_pricing]`
- "My Change Orders" — filters to `co.org_id === orgId`

There is **no section** showing approved COs where the FC was a collaborator. Once an FC completes their input (collaborator status → `completed`) and the CO gets approved, it vanishes from the FC view entirely. The FC cannot bill against it.

### Bug 2: "My Change Orders" filter too narrow
`myCOs` checks `co.org_id === orgId`, but historically some FC-created COs were saved with TC's org_id instead of FC's. Even with the fix going forward, it should also match on `created_by_role === 'FC'` with a collaborator check as a fallback.

### Bug 3: Historical bad data — FC-created COs have wrong org_id
Two FC-created COs (532da6cd, d50f80af) have `org_id = TC_Test` instead of `FC_Test`. RLS blocks the FC from seeing them entirely since neither `org_id`, `assigned_to_org_id`, nor any collaborator record links them to the FC org.

### Bug 4: Duplicate CO numbers
Two approved COs both have `co_number = 'CO-002'`. The new numbering system prevents this going forward but existing data needs cleanup.

## Plan

### 1. Add "Approved / Billable" section to FCHomeScreen
Add a third section below "My Change Orders" that shows COs where FC is a collaborator with `completed` status AND the CO status is `approved` or `contracted`. This lets FC see and navigate to approved COs for billing.

### 2. Broaden the "My Change Orders" filter
Change `myCOs` from `co.org_id === orgId` to also include COs where `co.created_by_role === 'FC'` and the FC org is a collaborator. This catches edge cases where org_id was set incorrectly.

### 3. Fix historical data via migration
- Update the two FC-created COs to set `org_id = FC_Test (6e563ffc)` and `assigned_to_org_id = TC_Test (ab07e031)`
- Re-number them with the new convention (e.g., `CO-MAI-FC-TC-0001`, `CO-MAI-FC-TC-0002`)

### Files Modified
- `src/components/change-orders/FCHomeScreen.tsx` — add approved section, fix myCOs filter
- Database migration — fix historical org_id and co_number data

