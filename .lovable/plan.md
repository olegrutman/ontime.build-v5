
# Fix: GC Can Only Create SOVs for Their Own Contracts

## Problem Summary

When a GC views the SOV tab and clicks "Create SOVs from Template", the system creates SOVs for **all** contracts on the project - including FC-TC contracts where the GC is not a party. This causes errors because:

1. The `useContractSOV` hook fetches ALL contracts for a project without filtering by the current user's organization
2. The `createAllSOVs` function processes all contracts returned by the hook
3. GC should only be able to create/manage SOVs for contracts where they are the payer (GC-TC contracts)

---

## Solution

Filter the contracts in `useContractSOV.ts` to only include contracts where the current user's organization is either the `from_org_id` (contractor) or `to_org_id` (payer).

---

## Technical Changes

### File: `src/hooks/useContractSOV.ts`

**Change 1: Import useAuth and get current org**

The hook needs access to the current user's organization to filter contracts:

```typescript
import { useAuth } from '@/hooks/useAuth';

export function useContractSOV(projectId: string | undefined) {
  const { userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization?.id;
  
  // ... rest of hook
}
```

**Change 2: Filter contracts by current org in fetchData**

After fetching contracts, filter to only those where the user's org is a party:

```typescript
// Map contracts with org names
const fetchedContracts: ProjectContract[] = (contractsResult.data || [])
  .map((c: any) => ({
    // ... existing mapping
  }))
  // Filter to only contracts where current org is a party
  .filter((c: ProjectContract) => 
    c.from_org_id === currentOrgId || c.to_org_id === currentOrgId
  );
```

---

## Verification

| Scenario | Before | After |
|----------|--------|-------|
| GC views SOV tab | Sees GC-TC + FC-TC contracts | Only sees GC-TC contracts |
| GC creates SOVs | Creates for ALL contracts | Only creates for GC-TC contracts |
| TC views SOV tab | Sees GC-TC + FC-TC contracts | Sees both (they are party to both) |
| FC views SOV tab | Sees all contracts | Only sees FC-TC contracts |

---

## Additional Consideration: Handle Null Org IDs

Some contracts may have `null` for `from_org_id` or `to_org_id` when invitees haven't accepted yet. The filtering should still work since the comparison will be `null === currentOrgId` which is `false`.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useContractSOV.ts` | Add org filtering to contract fetch |

---

## Summary

This fix ensures that each organization can only view and manage SOVs for contracts where they are a party. This follows the existing RLS patterns used elsewhere in the codebase (e.g., in `EditProject.tsx` which already filters contracts by current org).
