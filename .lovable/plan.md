

# Fix: GC↔TC Contract Hidden Due to NULL Trade Filter

## Root Cause

The GC↔TC contract (`26f2c4a2`) has `trade = NULL`. In PostgreSQL, `NULL != 'Work Order'` evaluates to `NULL` (falsy), so the `.neq('trade', 'Work Order')` filter in the contracts query **silently excludes** any contract with a NULL trade value.

This is why the TC only sees one contract (TC↔FC, trade='Framer') and the GC↔TC SOV section disappears entirely.

The SOVs themselves are fine — v5 (GC↔TC, locked) and v7 (TC↔FC) are separate in the database. The bug is purely in the query filter.

## Fix

### Both contract queries need updating (same pattern in 2 places)

**File: `src/pages/ProjectSOVPage.tsx`** — Lines 459-464
**File: `src/hooks/useSOVPage.ts`** — Lines 16-21

Replace:
```ts
.neq('trade', 'Work Order')
.neq('trade', 'Work Order Labor');
```
With:
```ts
.or('trade.is.null,and(trade.neq.Work Order,trade.neq.Work Order Labor)');
```

This keeps contracts where `trade` is NULL (like the GC↔TC contract) while still excluding Work Order contracts.

### Also: Set trade on GC↔TC contract creation

**File: `src/pages/ProjectContractsPage.tsx`** — `handleSave` function

When creating the GC↔TC contract, the `trade` field is never set, leaving it NULL. While the query fix above handles this, it's better to also set `trade` during contract creation to avoid future filter issues. The project's trade type should be populated from the project team member's role or the org's trade.

## Files changed

| File | Change |
|------|--------|
| `src/pages/ProjectSOVPage.tsx` | Fix `.neq` filter to include NULL trade values |
| `src/hooks/useSOVPage.ts` | Same filter fix |
| `src/pages/ProjectContractsPage.tsx` | Set `trade` field when creating contracts |

