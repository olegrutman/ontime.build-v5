

# Bug Report: SOV Page — Contracts Displayed Backwards

## Bugs Found

### Bug 1: `getContractDisplayName` shows arrow in wrong direction
The contract data model stores `from_org` = **worker** (invoice sender) and `to_org` = **payer**. The display function renders `from → to`, which shows **"IMIS, LLC → Haley Custom Homes"** (worker → payer). This is backwards — convention is **payer → worker** (e.g. "GC → TC").

**Evidence:** The database has `from_org_name: IMIS (TC)`, `to_org_name: Haley (GC)` for a GC-pays-TC contract. The SOV name reads "IMIS, LLC → Haley Custom Homes" — TC → GC instead of GC → TC.

**Fix:** In `getContractDisplayName` (line 114 of `useContractSOV.ts`), swap to `${to} → ${from}`.

### Bug 2: TC partition logic is swapped
When a TC views the SOV page, contracts are split into "GC → TC" and "TC → FC" sections. The filter logic is backwards:

- `gcToTcSovs` uses `to_org_id === currentOrgId` — but `to_org` = payer, so this finds contracts where TC is the **payer**, not the receiver
- `tcToFcSovs` uses `from_org_id === currentOrgId` — but `from_org` = worker, so this finds contracts where TC is the **worker**, not the payer

Result: GC→TC contracts appear under "TC → FC" and vice versa.

**Fix:** In `ContractSOVEditor.tsx` lines 256-263, swap the filters:
- `gcToTcSovs`: `from_org_id === currentOrgId` (TC is the worker/invoice sender)
- `tcToFcSovs`: `to_org_id === currentOrgId` (TC is the payer)

## Changes

### 1. `src/hooks/useContractSOV.ts` — line 114
```typescript
// Before: return `${from} → ${to}`;
// After:
return `${to} → ${from}`;
```

### 2. `src/components/sov/ContractSOVEditor.tsx` — lines 256-263
Swap the org_id checks:
```typescript
const gcToTcSovs = isTC ? contractSovs.filter(sov => {
  const contract = getContractForSOV(sov);
  return contract?.from_org_id === currentOrgId; // TC is worker (GC pays TC)
}) : [];
const tcToFcSovs = isTC ? contractSovs.filter(sov => {
  const contract = getContractForSOV(sov);
  return contract?.to_org_id === currentOrgId; // TC is payer (TC pays FC)
}) : [];
```

### 3. Database: Update stale stored SOV names
Run a migration to flip stored `sov_name` values that contain " → " so they match the corrected display format. This is a data cleanup for existing SOVs.

