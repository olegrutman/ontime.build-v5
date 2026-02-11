
# Fix: Overview Financials Picking Wrong Contract

## Problem Found

The Project Overview financial section (`ProjectFinancialsSectionNew.tsx`) uses `.find()` to locate the main upstream/downstream contracts, but `.find()` returns the **first** match. Since work order contracts also match the same role pattern (TC to GC, FC to TC), it picks a work order contract ($4,473) instead of the main contract ($250,000). This causes:

- "Contract with TC_Test" showing $4,473 instead of $250,000
- Billing Progress at 577% (dividing $25,829 billed by $4,473)
- Negative "Outstanding" and "Remaining" values

The SOV page is displaying correctly -- the bug is only on the Overview.

## Fix

### File: `src/components/project/ProjectFinancialsSectionNew.tsx`

**Lines 325-333**: Filter out work order contracts when finding the main upstream/downstream contracts.

Change:
```typescript
const upstreamContract = contracts.find(c => 
  (c.from_role === 'General Contractor' && c.to_role === 'Trade Contractor') ||
  (c.to_role === 'General Contractor' && c.from_role === 'Trade Contractor')
);

const downstreamContract = contracts.find(c => 
  (c.from_role === 'Trade Contractor' && c.to_role === 'Field Crew') ||
  (c.to_role === 'Trade Contractor' && c.from_role === 'Field Crew')
);
```

To:
```typescript
const upstreamContract = contracts.find(c => 
  ((c.from_role === 'General Contractor' && c.to_role === 'Trade Contractor') ||
   (c.to_role === 'General Contractor' && c.from_role === 'Trade Contractor')) &&
  c.trade !== 'Work Order' && c.trade !== 'Work Order Labor'
);

const downstreamContract = contracts.find(c => 
  ((c.from_role === 'Trade Contractor' && c.to_role === 'Field Crew') ||
   (c.to_role === 'Trade Contractor' && c.from_role === 'Field Crew')) &&
  c.trade !== 'Work Order' && c.trade !== 'Work Order Labor'
);
```

This ensures only the main trade contract (trade="Framer" in this case) is selected, not the work order contracts that share the same role pairing.

### Expected Results After Fix

- GC Overview: "Contract with TC_Test: $250,000" (was $4,473)
- Billing Progress: ~10% (was 577%)
- Outstanding: positive value (was negative)
- Work Orders Total: $103,924.55 (unchanged, already correct)

### Files Modified
- `src/components/project/ProjectFinancialsSectionNew.tsx` -- add trade filter to contract lookups (2-line change)
