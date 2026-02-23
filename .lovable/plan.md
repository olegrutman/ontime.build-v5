
# Fix: GC Should Not See TC-to-FC Contracts on SOV Page

## Problem
When a GC creates a project and adds a TC, then the TC adds an FC with a contract value, the GC's SOV page incorrectly shows "contract missing SOV" for the TC-to-FC contract. The GC has no role in managing the TC-to-FC relationship and should not see those contracts on their SOV page at all.

## Root Cause
The contract filtering logic uses a `creatorMatch` / `isProjectCreator` flag that grants the project creator (GC) visibility into ALL contracts on the project, including TC-to-FC contracts they are not a party to.

This affects three locations:
1. **Contract list** -- GC sees TC-FC contracts in the SOV editor
2. **Missing SOV warnings** -- GC gets prompted to create SOVs for TC-FC contracts
3. **SOV readiness check** -- Dashboard shows TC-FC contracts as "missing SOV"

## Fix

### File: `src/hooks/useContractSOV.ts`

**Line 363-364** -- Contract filter: Remove `creatorMatch` from the visibility filter. Each org should only see contracts where they are directly a party (`from_org_id` or `to_org_id`).

Before:
```
.filter((c) => c.from_org_id === currentOrgId || c.to_org_id === currentOrgId || creatorMatch)
```

After:
```
.filter((c) => c.from_org_id === currentOrgId || c.to_org_id === currentOrgId)
```

**Line 464** -- `contractsMissingSOVs`: Remove `isProjectCreator` from the payer check. Only the actual payer (`to_org_id`) should be prompted to create an SOV.

Before:
```
(c.to_org_id === currentOrgId || isProjectCreator)
```

After:
```
c.to_org_id === currentOrgId
```

**Line 478** -- `createAllSOVs`: Same change -- remove `isProjectCreator` from the payer filter.

### File: `src/hooks/useSOVReadiness.ts`

**Line 85-86** -- The readiness check uses `creatorFlag` to show all contracts to the project creator. Remove this so GC only sees contracts where their org is `to_org_id` (the payer).

Before:
```
(!userOrgId || c.to_org_id === userOrgId || (creatorFlag && (c.from_org_id === userOrgId || c.to_org_id === userOrgId)))
```

After:
```
(!userOrgId || c.to_org_id === userOrgId)
```

The `creatorFlag` state variable and related fetch logic can also be cleaned up since it is no longer used.

## Result
- GC only sees GC-TC contracts on the SOV page (contracts they are paying for)
- TC sees GC-TC contracts (revenue) and TC-FC contracts (cost) -- both directions where they are a party
- FC sees TC-FC contracts only
- No role sees contracts they are not a party to
- SOV readiness warnings are scoped correctly per org
