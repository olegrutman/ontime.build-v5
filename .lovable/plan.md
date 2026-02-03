
# Fix: TC Can Create SOVs for FC-TC Contracts + Add "Create SOV" for Individual Contracts

## Problem Summary

Two related issues with SOV creation:

1. **TC can't create SOV for FC-TC contracts**: When a TC adds a new FC-TC contract, they cannot create an SOV for it. The current `createAllSOVs` function creates SOVs for ALL visible contracts, but doesn't respect who should be creating the SOV (the payer/client).

2. **No way to recreate deleted SOVs**: If an SOV is deleted from the SOV page, there's no UI to create a new one for that specific contract. The "Create SOVs from Template" button only appears when NO SOVs exist.

## Business Rule

**SOVs are created by the payer (to_org)** - the organization receiving invoices:
- GC-TC contract: GC (to_org) creates the SOV
- FC-TC contract: TC (to_org) creates the SOV

This means:
- GC can create SOVs for contracts where they are `to_org`
- TC can create SOVs for contracts where they are `to_org` (FC-TC contracts)

---

## Solution

### Change 1: Filter SOV creation by payer role

Update `createAllSOVs` in `useContractSOV.ts` to only create SOVs for contracts where the current organization is the **payer** (`to_org_id`).

**Current Logic (wrong)**:
```typescript
// Creates SOVs for ALL visible contracts (where org is from_org OR to_org)
const contractsWithValue = contracts.filter(c => 
  (c.contract_sum || 0) > 0 && !isWorkOrderContract(c)
);
```

**New Logic (correct)**:
```typescript
// Only create SOVs for contracts where current org is the PAYER (to_org)
const contractsWithValue = contracts.filter(c => 
  (c.contract_sum || 0) > 0 && 
  !isWorkOrderContract(c) &&
  c.to_org_id === currentOrgId  // Only payer can create SOV
);
```

### Change 2: Add function to create SOV for a single contract

Add a new function `createSOVForContract(contractId: string)` to create an SOV for a specific contract. This will be used for:
- Creating SOV for newly added contracts
- Recreating a deleted SOV

### Change 3: Update UI to show "Contracts Missing SOVs" section

Update `ContractSOVEditor.tsx` to:
1. Calculate which contracts need SOVs (where current org is payer and no SOV exists)
2. Show a "Contracts Pending SOV" section with a button to create SOV for each
3. This section appears even when other SOVs exist

---

## Technical Implementation

### File: `src/hooks/useContractSOV.ts`

**Add `createSOVForContract` function**:
```typescript
const createSOVForContract = useCallback(async (contractId: string) => {
  const contract = contracts.find(c => c.id === contractId);
  if (!contract) return;
  
  // Verify current org is the payer
  if (contract.to_org_id !== currentOrgId) {
    toast({
      title: 'Cannot Create SOV',
      description: 'Only the payer organization can create an SOV for this contract.',
      variant: 'destructive'
    });
    return;
  }
  
  // Check if SOV already exists
  if (sovs.find(s => s.contract_id === contractId)) {
    toast({
      title: 'SOV Already Exists',
      description: 'An SOV already exists for this contract.',
      variant: 'destructive'
    });
    return;
  }
  
  setSaving(true);
  try {
    // Get project details and generate items...
    // Same logic as createAllSOVs but for single contract
  }
});
```

**Modify `createAllSOVs` to filter by payer**:
```typescript
const contractsWithValue = contracts.filter(c => 
  (c.contract_sum || 0) > 0 && 
  !isWorkOrderContract(c) &&
  c.to_org_id === currentOrgId  // Only payer can create
);
```

**Add `contractsMissingSOVs` computed value**:
```typescript
// Calculate contracts that need SOVs (current org is payer, has value, no SOV yet)
const contractsMissingSOVs = useMemo(() => {
  const isWorkOrderContract = (c: ProjectContract) => 
    c.trade === 'Work Order' || c.trade === 'Work Order Labor';
    
  const contractsWithSOVs = new Set(sovs.map(s => s.contract_id).filter(Boolean));
  
  return contracts.filter(c => 
    (c.contract_sum || 0) > 0 &&
    !isWorkOrderContract(c) &&
    c.to_org_id === currentOrgId &&  // Current org is payer
    !contractsWithSOVs.has(c.id)     // No SOV exists
  );
}, [contracts, sovs, currentOrgId]);
```

### File: `src/components/sov/ContractSOVEditor.tsx`

**Add "Missing SOVs" section**:
After the existing SOVs are rendered, add a section showing contracts that need SOVs:

```jsx
{contractsMissingSOVs.length > 0 && !isFC && (
  <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        Contracts Missing SOV
      </CardTitle>
      <CardDescription>
        The following contracts need a Schedule of Values before you can bill against them.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-2">
      {contractsMissingSOVs.map(contract => (
        <div key={contract.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
          <div>
            <span className="font-medium">
              {getContractDisplayName(contract.from_role, contract.to_role, contract.from_org_name, contract.to_org_name)}
            </span>
            <span className="text-muted-foreground ml-2">
              {formatCurrency(contract.contract_sum)}
            </span>
          </div>
          <Button 
            size="sm"
            onClick={() => createSOVForContract(contract.id)}
            disabled={saving}
          >
            <Plus className="mr-1 h-4 w-4" />
            Create SOV
          </Button>
        </div>
      ))}
    </CardContent>
  </Card>
)}
```

---

## UI Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| GC views SOV tab with GC-TC contract | Sees contract, can create SOV | Same (GC is payer) |
| TC views SOV tab with GC-TC contract | Sees contract, can create SOV (wrong!) | Sees contract but cannot create SOV (TC is not payer) |
| TC views SOV tab with FC-TC contract | Cannot see or create SOV | Can see and create SOV (TC is payer) |
| Any user deletes SOV | No way to recreate | "Create SOV" button appears for that contract |
| TC adds new FC-TC contract | No way to create SOV | "Contracts Missing SOV" section shows the contract |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useContractSOV.ts` | Add `createSOVForContract`, filter `createAllSOVs` by payer, add `contractsMissingSOVs` |
| `src/components/sov/ContractSOVEditor.tsx` | Add "Contracts Missing SOV" section with per-contract create buttons |

---

## Benefits

1. **Correct Permission Model**: Only the payer can create/manage SOVs
2. **Self-Service SOV Creation**: TCs can create SOVs for FC-TC contracts independently
3. **Recovery from Deletion**: Users can recreate SOVs if accidentally deleted
4. **Clear Visibility**: Pending contracts are shown prominently with action buttons
