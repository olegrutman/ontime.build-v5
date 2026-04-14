

# GC KPI Cards: Separate Cost Breakdown + Editable Budget

## What Changes

Currently GC sees 4 KPI tiles: "TC Submitted", "Materials + Equipment" (combined), "Total Cost", "GC Budget" (read-only, set at creation). 

New layout — 5 KPI tiles in the GC view:

| Labor Cost | Material Cost | Equipment Cost | Total Cost | GC Budget (editable) |
|---|---|---|---|---|

- **Labor Cost** = `financials.grandTotal` (TC submitted labor)
- **Material Cost** = `financials.materialsTotal` (final billed amount, no markup breakdown)
- **Equipment Cost** = `financials.equipmentTotal`
- **Total Cost** = labor + materials + equipment (sum of above 3)
- **GC Budget** = editable inline — click to enter/edit, saves to `change_orders.gc_budget`. Shows percentage badge comparing total cost vs budget.

## Technical Changes

### 1. Update GC tiles in `COKPIStrip.tsx`

Replace the current 4-tile GC array with 5 tiles. The grid changes from `lg:grid-cols-4` to `lg:grid-cols-5` when GC. Add an `editable` flag to the KPITile interface.

For the GC Budget tile, render an inline input (click "—" or the value to edit). On blur/enter, call `supabase.from('change_orders').update({ gc_budget: value }).eq('id', co.id)` and trigger a refetch via `onRefresh` callback.

### 2. Wire `onRefresh` into COKPIStrip

**`CODetailLayout.tsx`** — pass `onRefresh={refetchCO}` (the existing query refetch) to `COKPIStrip`.

**`COKPIStrip.tsx`** — add `onRefresh?: () => void` to props. The budget tile uses it after saving.

### 3. Specific tile breakdown for GC

```
tiles = [
  { label: 'Labor Cost',     value: financials.grandTotal },
  { label: 'Material Cost',  value: financials.materialsTotal },
  { label: 'Equipment Cost', value: financials.equipmentTotal },
  { label: 'Total Cost',     value: totalCost, badge: 'Final' },
  { label: 'GC Budget',      value: co.gc_budget, editable: true,
    badge: shows "X%" + healthy/watch based on totalCost vs budget },
]
```

Two files changed: `COKPIStrip.tsx` (tile definitions + inline edit), `CODetailLayout.tsx` (pass onRefresh prop).

