

# Connect SOV to Invoices — Fix Version Selection

## Problem
When the TC opens "Create Invoice from SOV", the dialog fetches ALL SOV versions for the project but uses `Array.find()` to pick the SOV matching the contract — which returns the **first (oldest) version** instead of the latest locked one. With 5 SOV versions in the database, the dialog may show stale SOV items from v1 instead of the current locked v5.

## Fix

**File: `src/components/invoices/CreateInvoiceFromSOV.tsx`**

### 1. Update SOV query to include `version` and `is_locked`
Change line 186-188 from:
```ts
.select('id, contract_id, sov_name')
```
to:
```ts
.select('id, contract_id, sov_name, version, is_locked')
.order('version', { ascending: false })
```

### 2. Update SOV interface
Add `version` and `is_locked` to the `SOV` interface (line 44-48).

### 3. Fix `selectedSOV` logic
Change line 265-268 to pick the **latest locked** SOV for the selected contract. If no locked version exists, fall back to the latest version:
```ts
const selectedSOV = useMemo(() => {
  const contractSovs = sovs.filter(s => s.contract_id === selectedContractId);
  // Prefer latest locked version; fall back to latest version
  return contractSovs.find(s => s.is_locked) || contractSovs[0] || null;
}, [sovs, selectedContractId]);
```
Since the query is ordered by `version DESC`, `contractSovs[0]` is already the latest, and `find(s => s.is_locked)` returns the latest locked one.

### 4. Show warning if no locked SOV
After the contract selector, if a contract is selected but the matching SOV is not locked, show an info alert: "SOV is not locked. Lock the SOV before creating invoices." This prevents billing against a draft SOV that may still change.

## Files changed

| File | Change |
|------|--------|
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Fix SOV query, interface, version selection logic, add locked check |

