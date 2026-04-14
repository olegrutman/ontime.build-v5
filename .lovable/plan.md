

# Add TC Material Profit Margin

## What's Wrong

1. **TC profitability is missing material costs**: Revenue includes `materialsTotal` (billed amount with markup), but costs don't include `materialsCost` (supplier price). So materials markup inflates profit incorrectly. Same bug in COSidebar, COProfitabilityCard, and COKPIStrip.

2. **No inline editing of markup on saved materials**: TC can only set markup % when adding a new draft row. Once saved, there's no way to edit it. TC needs to be able to add/change their profit margin on existing materials.

3. **Labels don't clarify the cost vs margin concept**: "Unit cost" and "Markup %" are generic — should be reframed as "Supplier cost" and "My margin" for TC.

## Changes

### 1. Fix TC profitability to include material + equipment costs
**Files**: `COSidebar.tsx`, `COProfitabilityCard.tsx`, `COKPIStrip.tsx`

Add `materialsCost + equipmentCost` to TC costs calculation:
```typescript
// Before
costs = financials.fcLaborTotal + financials.tcActualCostTotal;
// After  
costs = financials.fcLaborTotal + financials.tcActualCostTotal + financials.materialsCost + financials.equipmentCost;
```

This ensures the supplier price is treated as TC's cost, and only the markup flows through as profit.

### 2. Add inline markup editing on saved materials
**File**: `COMaterialsPanel.tsx`

Make the "Markup %" column editable for saved materials (TC only, when `canEdit`). On blur/change, call `supabase.from('co_material_items').update({ markup_percent })` — the DB trigger recalculates `markup_amount` and `billed_amount` automatically. Then call `onRefresh()`.

### 3. Update labels for TC clarity
**File**: `COMaterialsPanel.tsx`

- Column header: "Unit cost" → "Supplier cost" (TC only)
- Column header: "Markup %" → "My margin" (TC only)
- Footer: "Cost" → "Supplier cost", "Markup" → "My margin"

GC labels stay as-is since they see it differently.

## Summary
Three files changed. The core fix ensures supplier price = TC cost in profitability math, and lets TCs edit their margin on saved materials.

