

# Allow TC Project Creator to Set Up SOVs for Both GC and FC Contracts

## Problem
When a Trade Contractor creates a project, they set up contracts in both directions:
- **Upstream**: GC pays TC (GC is payer, TC is worker)
- **Downstream**: TC pays FC (TC is payer, FC is worker)

Currently, the SOV system only lets the **payer** (`to_org_id`) create and manage an SOV. This means the TC can only create the FC SOV, not the GC one -- even though they created the project and set up all the contracts.

## Solution
Add a "project creator" check. If the current user created the project, they can create and manage SOVs for **all** contracts on the project, not just the ones where their org is the payer.

## Changes

### 1. `src/hooks/useContractSOV.ts`

**Fetch project creator info**: Add a query to check if the current user is the project creator (`projects.created_by = auth.uid()`).

**Relax the payer-only filter** in three places:
- **Contract visibility** (line 354): Already shows contracts where `from_org_id` or `to_org_id` matches -- no change needed here.
- **`contractsMissingSOVs`** (line 449-458): Change the filter from `c.to_org_id === currentOrgId` to `c.to_org_id === currentOrgId || isProjectCreator`.
- **`createAllSOVs`** (line 466-469): Same change -- allow creation for all primary contracts if user is project creator.

### 2. `src/hooks/useSOVReadiness.ts`

Update the readiness check to also consider contracts where the user's org is the **worker** (`from_org_id`) if they are the project creator. Currently it only checks `to_org_id === userOrgId`.

This requires passing an `isProjectCreator` flag or removing the org filter when the creator is checking readiness.

### 3. `src/components/sov/ContractSOVEditor.tsx`

No structural changes needed. The UI already renders all contracts returned by the hook. Once the hook returns both GC and FC contracts with SOV creation ability, the UI will show both.

### Summary of Logic

```
Can create SOV for a contract?
  YES if: user's org is the payer (to_org_id)
  YES if: user created the project (projects.created_by = user.id)
  NO otherwise
```

This is consistent with the wizard flow where the TC creator sets up everything during project setup.

