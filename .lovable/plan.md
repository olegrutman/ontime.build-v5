

# Bug: TC→FC SOV Shows Wrong Billed Total ($28,812)

## Root Cause

The `billed_to_date` field on `project_sov_items` is a **project-wide aggregate** — it sums billing across ALL SOVs for the same item name. The **SOV-specific** billed amount is stored in `total_billed_amount`.

**Evidence from network data** for the FC→TC SOV (`7ede55c5`):
- "First Sub-floor TJI's": `billed_to_date=14,699.50` (cross-SOV), `total_billed_amount=5,950` (this SOV only)
- "First Sub-floor Sheeting": `billed_to_date=9,862.85` (cross-SOV), `total_billed_amount=3,612.50` (this SOV only)

Summing `billed_to_date` for that SOV gives ~$28,812 (the wrong number). Summing `total_billed_amount` gives ~$13,812 (correct).

## Affected Code

### 1. `ContractSOVItem` type — `src/hooks/useContractSOV.ts` (line 46)
Missing `total_billed_amount` and `total_completion_percent` fields. Add them.

### 2. `calcBillingTotals` — `src/components/sov/ContractSOVEditor.tsx` (line 270)
Uses `item.billed_to_date` — change to `item.total_billed_amount`.

### 3. `getSOVTotals` — `src/hooks/useContractSOV.ts` (line 916)
Uses `item.billed_to_date` — change to `item.total_billed_amount`.

### 4. `deleteSOV` guard — `src/hooks/useContractSOV.ts` (line 926)
Uses `billed_to_date` to check if items have billing — change to `total_billed_amount`.

### 5. Item-level display — `src/components/sov/ContractSOVEditor.tsx`
- Line 662: delete guard uses `billed_to_date` — change to `total_billed_amount`
- Line 709: `SOVProgressBar billedToDate` uses `billed_to_date` — change to `total_billed_amount`

All references to `billed_to_date` in the contract SOV flow should be replaced with `total_billed_amount` since each SOV is per-contract and needs its own billing numbers.

