

# Material Responsibility: Audit Findings & Fix Plan

## What I Found

### The Data
All 3 WOs on the Remodel project have `materials_responsible = 'GC'` and `equipment_responsible = 'GC'`. This means the GC is the party supplying and paying for materials/equipment directly — these costs are **not part of the TC's billable amount to the GC**.

### Problem 1: GC KPI Strip shows material/equipment costs that are their own responsibility
In `COKPIStrip.tsx` (WO detail page), the GC sees:
- **Labor Cost**: $650 (correct — TC's billable)
- **Material Cost**: $5,292 (WRONG — GC is material-responsible, so this is GC's own cost, not a cost billed by TC)
- **Equipment Cost**: $287.50 (WRONG — same issue)
- **Total Cost**: $6,229.50 (WRONG — includes materials/equipment the GC is paying for directly)

When `materials_responsible = 'GC'`, the GC supplies materials themselves. The material items in `co_material_items` were added by the TC (role='TC') but represent items the GC is procuring. The GC should **not** see these as "TC Cost" in their KPI cards — they are GC's own procurement costs, separate from what the TC is billing.

**The fix**: When `materials_responsible = 'GC'`, the GC's KPI strip should show only the TC's labor cost as "TC Cost". Materials/equipment should either be hidden or shown separately as "Your Material Cost" (GC's own procurement). The `Total Cost` tile should reflect only what the TC is billing (labor only when GC is material-responsible).

### Problem 2: GC Overview page (T&M mode) also double-counts
In `GCProjectOverviewContent.tsx`, the T&M overview computes:
```
coCostTotal = coLaborCost + coMaterialsCost + coEquipmentCost
```
This sums ALL material/equipment costs across WOs regardless of who is responsible. When `materials_responsible = 'GC'`, those costs are GC's own — they shouldn't be in "TC Cost" card.

### Problem 3: COKPIStrip doesn't receive responsibility data
The `COKPIStrip` component receives `hasMaterials` and `hasEquipment` booleans but **not** who is responsible. It has no way to conditionally hide or relabel costs.

### Problem 4: `useChangeOrderDetail` financials include all materials regardless of responsibility
`financials.materialsTotal` and `financials.equipmentTotal` always sum all items. There's no filtering by responsibility. The `grandTotal` always includes them.

## Fix Plan

### File 1: `src/components/change-orders/COKPIStrip.tsx`
- Add `materialResponsible` and `equipmentResponsible` props (type `'GC' | 'TC'`)
- In `getTiles()` for GC view:
  - If `materialResponsible === 'GC'`: hide the "Material Cost" tile (or show as "$0" with label "GC Supplied")
  - If `equipmentResponsible === 'GC'`: hide the "Equipment Cost" tile
  - `Total Cost` = only TC's labor cost when GC is responsible for both mat+equip
  - When GC is responsible, show 3 tiles: **TC Labor**, **Total TC Cost**, **GC Budget** (since mat/equip are GC's own procurement, not TC's bill)
- TC view: When `materialResponsible === 'GC'`, hide materials from "Total to GC" since TC isn't billing GC for materials

### File 2: `src/components/change-orders/CODetailLayout.tsx`
- Pass `responsibility.materialResponsible` and `responsibility.equipmentResponsible` to `COKPIStrip`

### File 3: `src/components/project/GCProjectOverviewContent.tsx`
- In T&M mode, fetch `materials_responsible` per WO from the `change_orders` query (already selected in `*` but the query only selects specific columns — add `materials_responsible, equipment_responsible`)
- Only include material/equipment costs in `coCostTotal` for WOs where the TC is the responsible party
- Update "TC Cost" card sub-label to clarify what's included

### File 4: `src/hooks/useChangeOrderDetail.ts`
- No change needed — the raw financials are correct. The filtering by responsibility should happen at the presentation layer (KPI tiles), not in the hook, because other components (like TC's own view) need the full totals.

## Summary of Changes

| File | Change |
|---|---|
| `COKPIStrip.tsx` | Add responsibility props; conditionally exclude mat/equip from GC's tiles when GC-supplied |
| `CODetailLayout.tsx` | Pass responsibility data to KPI strip |
| `GCProjectOverviewContent.tsx` | Filter T&M cost aggregation by `materials_responsible` per WO |

Three files, focused on presentation-layer filtering based on the `materials_responsible` flag that already exists on each WO.

