

# Sync Dual SOVs: Mirror Edits Between Upstream and Downstream

## What I Understand
When the TC adjusts an SOV line item (name or percentage) on one SOV (e.g., GC→TC), the other SOV (TC→FC) should automatically get the same item name and percentage changes. The dollar amounts will differ because each SOV has its own contract value, but the structure (names, percentages, sort order) stays identical.

## Current State
- Two SOVs exist per TC project: `GC → TC SOV` ($231K) and `TC → FC SOV` ($160K)
- Items already share the same names and sort orders
- No sync mechanism exists — edits to one SOV don't touch the other

## Approach: Find Sibling SOV and Mirror Changes

In `useContractSOV.ts`, after each edit operation succeeds on the primary SOV, find the "sibling" SOV (same project, different contract) and apply the same change.

### Helper: Find Sibling SOV
```text
Given sovId → find its contract → find other SOV on same project → that's the sibling
Match items between SOVs by sort_order (they share the same structure)
```

### Changes to `useContractSOV.ts`

| Function | Sync Logic |
|----------|-----------|
| `updateItemPercent` | After RPC succeeds on primary, find sibling SOV's matching item (by sort_order), call the same RPC with sibling's contract value to recalculate dollar amounts |
| `updateItemName` | After name update succeeds, find sibling item by sort_order, update its name too |
| `addItem` | After adding to primary SOV, insert same item (name, sort_order, 0%) into sibling SOV |
| `deleteItem` | After deleting from primary, delete matching item (by sort_order) from sibling |
| `reorderItems` | After reordering primary, apply same sort_order changes to sibling items |

### Key Rules
- Percentages sync exactly (e.g., 19.71% on both)
- Dollar amounts are recalculated per each SOV's own contract value
- Item names sync exactly
- Sort order syncs exactly
- Only applies when two SOVs exist on the same project (TC has both upstream and downstream)

### File Changes

| File | Change |
|------|--------|
| `src/hooks/useContractSOV.ts` | Add `findSiblingSov` helper; add mirror logic to `updateItemPercent`, `updateItemName`, `addItem`, `deleteItem`, `reorderItems` |

No database changes needed — uses existing tables and RPC.

