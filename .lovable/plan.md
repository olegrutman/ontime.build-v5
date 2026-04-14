

# Bug: TC Sees Supplier Pricing Despite GC Being Material-Responsible

## Root Cause

The `useCOResponsibility` hook has a **data source mismatch**. The WO wizard writes responsibility to `change_orders.materials_responsible` and `change_orders.equipment_responsible`. But the hook reads from two different places:

1. `co_material_responsible_override` (null — no override set)
2. `project_contracts.material_responsibility` (no rows exist for this T&M project)

Since both are empty, it defaults to `'TC'`, making `showPricingColumns = true` — so the TC sees all supplier pricing, costs, and PO links.

**Database proof:**
- WO `e8971bbe`: `materials_responsible = 'GC'`, `co_material_responsible_override = NULL`
- `project_contracts` table: **0 rows** for this project

## Fix

**File: `src/hooks/useCOResponsibility.ts`**

Change the resolution priority to:

1. `co_material_responsible_override` (per-WO override, if set)
2. `change_orders.materials_responsible` (the value set by the wizard)
3. `project_contracts.material_responsibility` (project-level default)
4. Fallback: `'TC'`

This requires passing `co.materials_responsible` and `co.equipment_responsible` into the hook alongside the override values.

### Changes

| File | Change |
|---|---|
| `useCOResponsibility.ts` | Accept `coMaterialDefault` and `coEquipmentDefault` params; use them before querying `project_contracts` |
| `CODetailLayout.tsx` | Pass `co.materials_responsible` and `co.equipment_responsible` to the hook |

### Updated hook signature

```typescript
export function useCOResponsibility(
  coId, projectId,
  coMaterialOverride,    // per-WO override (explicit toggle)
  coEquipmentOverride,   // per-WO override (explicit toggle)
  coMaterialDefault,     // from change_orders.materials_responsible (wizard)
  coEquipmentDefault,    // from change_orders.equipment_responsible (wizard)
)
```

Resolution becomes:
```
override ?? coDefault ?? contractDefault ?? 'TC'
```

Two files, minimal change, fixes the root cause for all downstream consumers (`showPricingColumns`, KPI strips, overview aggregation).

