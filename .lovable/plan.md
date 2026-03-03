

# Allow TC Project Creator to Create SOVs for All Contracts

## Problem
When a TC creates a project, they can only create SOVs for contracts where they are `to_org_id` (e.g., GC→TC). They cannot create SOVs for contracts where they are `from_org_id` (e.g., TC→FC), even though as project creator they should manage the full setup.

## Changes

### 1. `src/hooks/useContractSOV.ts`
- **Contract visibility (line 363)**: When user is project creator, show ALL project contracts (not just ones where their org is a party)
- **`contractsMissingSOVs` (line 461)**: When user is project creator, include contracts where their org is `from_org_id` OR `to_org_id` (not just `to_org_id`)
- **`createAllSOVs` (line 475)**: Same — when project creator, allow creating SOVs for contracts where they are either party
- The `isProjectCreator` flag already exists (line 307, 341) but isn't used for these filters

### 2. `src/hooks/useSOVReadiness.ts`
- **Line 86**: When user is project creator, check readiness across all contracts they're a party to (both `from_org_id` and `to_org_id`), not just `to_org_id`
- Pass `isProjectCreator` properly from callers (currently defaults to `false`)

### 3. `src/components/project/WorkOrdersTab.tsx`
- Pass `isProjectCreator` to the `useSOVReadiness` hook call (line 54) — currently not passed

**3 files modified. No database changes.**

