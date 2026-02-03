
# Plan: Fix SOV Readiness Check for GC Work Order Creation

## Problem

The GC sees an "SOV Setup Required" warning on the Work Orders tab even when the SOV between TC and GC has been created. This incorrectly blocks the GC from creating new work orders.

## Root Cause

The `useSOVReadiness` hook checks ALL contracts visible to the user, rather than only the contracts **the user's organization is responsible for managing**.

### Current Flawed Logic

```
Contracts visible to GC → [GC-TC Contract, TC-FC Contract] (if GC is project creator)
SOVs visible → [GC-TC SOV, TC-FC SOV] (both visible via participant RLS)
Check: Do ALL visible contracts have SOVs?
```

If the TC-FC contract doesn't have an SOV yet, the GC is incorrectly blocked - even though the TC-FC SOV is the **TC's responsibility**, not the GC's.

### How It Should Work

According to the system design, **SOVs are created and managed exclusively by the payer organization** (`to_org_id` on the contract). The readiness check should only verify SOVs for contracts where the current user's organization is the payer.

```
User's organization → GC_Test
Contracts where GC is payer → [GC-TC Contract] (to_org_id = GC_Test)
Check: Does the GC-TC contract have an SOV? → Yes
Result: isReady = true ✓
```

## Solution

Update `useSOVReadiness` to filter contracts by the user's organization, only checking contracts where the user's org is the `to_org_id` (payer/client side).

## Implementation

### File: `src/hooks/useSOVReadiness.ts`

**Changes Required:**

1. **Add user's organization ID to the hook** - Need to know which org the user belongs to
2. **Fetch contracts with `to_org_id`** - Include this field in the query
3. **Filter contracts to only those the user's org is responsible for** - Only check contracts where `to_org_id` matches user's org

```typescript
interface Contract {
  id: string;
  contract_sum: number | null;
  trade: string | null;
  to_org_id: string | null;  // NEW: needed to filter by payer
}

// In fetchData:
supabase
  .from('project_contracts')
  .select('id, contract_sum, trade, to_org_id')  // Add to_org_id
  .eq('project_id', projectId)

// In readiness calculation:
const primaryContracts = contracts.filter(
  c => (c.contract_sum || 0) > 0 
    && !isWorkOrderContract(c)
    && c.to_org_id === userOrgId  // NEW: Only contracts where user's org is payer
);
```

### Getting User's Organization

The hook will need access to the user's current organization ID. This can be obtained from:
- The `useAuth` hook which provides `currentRole` and user context
- Or pass it as a parameter to `useSOVReadiness`

**Recommended approach:** Pass `userOrgId` as a parameter since the hook is already being called from `WorkOrdersTab` which has access to auth context.

### Updated Hook Signature

```typescript
export function useSOVReadiness(
  projectId: string | undefined,
  userOrgId: string | undefined  // NEW parameter
): SOVReadiness & { refetch: () => void }
```

### File: `src/components/project/WorkOrdersTab.tsx`

**Update the hook call to include user's org ID:**

```typescript
const { userOrganizationId } = useAuth();  // Get user's org
const sovReadiness = useSOVReadiness(projectId, userOrganizationId);
```

### Checking useAuth for Organization Access

Need to verify that `useAuth` provides the user's organization ID. If not, we may need to:
- Add it to the auth context
- Or fetch it separately in the hook using the user's ID

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useSOVReadiness.ts` | Add `userOrgId` parameter, include `to_org_id` in query, filter contracts by payer org |
| `src/components/project/WorkOrdersTab.tsx` | Pass user's organization ID to the hook |
| `src/hooks/useAuth.tsx` | Verify org ID is available (may need to add if missing) |

## Alternative Consideration

If getting the user's org ID is complex, an alternative approach is to check if the user **can manage** the SOV for each contract. However, filtering by `to_org_id` is cleaner and aligns with the defined responsibility model.

## Expected Behavior After Fix

**For GC:**
- Only the GC-TC contract is evaluated for SOV readiness
- If GC-TC SOV exists → `isReady = true`
- GC can create work orders regardless of TC-FC SOV status

**For TC:**
- Both GC-TC and TC-FC contracts are evaluated (TC is payer on TC-FC)
- If TC-FC SOV is missing → `isReady = false` with message
- If both SOVs exist → `isReady = true`

**For FC:**
- FCs are already exempt from the SOV check (`isFC` bypass in WorkOrdersTab)
- No change needed
