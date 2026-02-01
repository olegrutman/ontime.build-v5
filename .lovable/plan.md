
# Plan: Unify Retainage Display for Main and Work Order Contracts

## Overview
Update the contract display in `ProjectContractsSection.tsx` to show both retainage percentage AND the calculated retainage amount, applied consistently to both Main Contracts and Change Order Contracts.

---

## Current State

The `ProjectContractsSection.tsx` currently displays:
- Contract Sum
- Work Orders ($0 placeholder)
- Invoiced ($0 placeholder)
- Retainage: Only shows percentage (e.g., "10%")

---

## Solution

### Calculate and Display Retainage Amount

For each contract, calculate the retainage amount based on:
- **Contract Sum** × **Retainage Percent** / 100

Display format: Show both the percentage and the calculated amount

```text
Retainage
10% ($4,500)
```

Or vertically:
```text
Retainage
$4,500
(10%)
```

---

## Implementation Details

### Update ProjectContractsSection.tsx

Modify the retainage display cell:

```typescript
// Current (line 236):
<p className="text-sm font-medium">{contract.retainage_percent || 0}%</p>

// Updated:
const retainageAmount = (contract.contract_sum || 0) * ((contract.retainage_percent || 0) / 100);

<div>
  <p className="text-xs text-muted-foreground">Retainage</p>
  <p className="text-sm font-medium">{formatCurrency(retainageAmount)}</p>
  <p className="text-xs text-muted-foreground">({contract.retainage_percent || 0}%)</p>
</div>
```

This applies to ALL contracts in the section - both main contracts and work order contracts will use the same consistent display.

---

## File Changes

| File | Change |
|------|--------|
| `src/components/project/ProjectContractsSection.tsx` | Update retainage display to show both amount and percentage |

---

## Expected Results

Before:
```text
Retainage
10%
```

After:
```text
Retainage
$4,500
(10%)
```

Both main contracts and change order contracts will display retainage identically with the calculated amount prominently shown and the percentage as secondary information.

---

## Testing Checklist

1. Verify main contracts show retainage amount and percentage
2. Verify work order (change order) contracts show the same format
3. Confirm $0 contracts show $0 retainage correctly
4. Confirm 0% retainage shows as $0 (0%)
