

# Fix: GC Contract Direction Error

## Problem
When a **GC** creates a project, the wizard sets `from_role = 'General Contractor'` and passes it to the contract insert. The database trigger `validate_contract_direction` rejects this because GC cannot be the invoicer/contractor — GC is always the **client** (payer).

The contract semantic is: `from_org = contractor who bills`, `to_org = client who pays`.

## Fix

### `src/hooks/useSetupWizardV2.ts` — lines 1128-1141

When the creator is a **GC**, the single contract should represent **the future TC billing the GC**:
- `from_role = 'Trade Contractor'` (the contractor who will bill — TBD)
- `from_org_id = null` (TC not yet assigned)
- `to_role = 'General Contractor'` (GC is the client/payer)
- `to_org_id = creatorOrgId` (GC's org)

Current code sets `fromRole` based on creator type and passes it directly. The fix reverses the direction for GC:

```
// Line ~1128-1141 becomes:
const isGC = creatorOrgType === 'GC';

if (isGC) {
  // GC is the CLIENT. Contract = future TC → GC
  primaryResult = await _saveContractAndSov(
    pid, contractValue,
    'Trade Contractor',      // from_role: TC bills
    null,                    // from_org_id: TC not yet known
    'General Contractor',    // to_role: GC pays
    creatorOrgId || null,    // to_org_id: GC's org
    'Framing SOV',
    scopeData, answers, userId,
  );
} else if (isTC) {
  // TC bills GC upstream
  primaryResult = await _saveContractAndSov(
    pid, contractValue,
    'Trade Contractor', creatorOrgId || null,
    'General Contractor', null,
    'GC → TC SOV',
    scopeData, answers, userId,
  );
}
```

The downstream FC contract (for TC projects) stays unchanged — it's already correct.

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Fix GC contract direction: GC is the `to_role` (client/payer), TC placeholder is `from_role` |

