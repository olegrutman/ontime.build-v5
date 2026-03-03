

# Remove Labor Budget Card from GC View

## Problem
The GC sees the Labor Budget card on the project overview, but it serves no purpose for them. Labor budget tracking is an FC concept — the FC sets their internal labor budget against the TC↔FC contract. The GC tracks profit via Owner Contract Value, not labor budgets.

## Change

### `src/components/project/BudgetTracking.tsx` (line 27)
Change the visibility check from:
```ts
const showLabor = viewerRole === 'General Contractor' || viewerRole === 'Field Crew';
```
to:
```ts
const showLabor = viewerRole === 'Field Crew';
```

**1 line changed. 1 file. No database changes.**

