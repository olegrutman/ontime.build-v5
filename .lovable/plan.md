

# Fix "My Margin" Update Error

## Problem
The session replay shows the error: **"column 'markup_amount' can only be updated to DEFAULT"**. This means `markup_amount` and `billed_amount` are generated (computed) columns in the database. The `MarkupEditor` component tries to write all three columns, but the DB rejects the update.

## Fix

**`src/components/change-orders/COMaterialsPanel.tsx`** (lines 84-95)

Remove the manual calculation of `markupAmount`/`billedAmount` and only update `markup_percent`. The DB trigger will recalculate the derived columns automatically.

```typescript
// Before (broken)
const lineCostRes = await supabase.from('co_material_items').select('unit_cost, quantity')...
const markupAmount = lineCost * (num / 100);
const billedAmount = lineCost + markupAmount;
await supabase.from('co_material_items').update({
  markup_percent: num,
  markup_amount: markupAmount,   // ERROR: generated column
  billed_amount: billedAmount,   // ERROR: generated column
}).eq('id', materialId);

// After (fixed)
await supabase.from('co_material_items').update({
  markup_percent: num,
}).eq('id', materialId);
```

One file, one change. The extra `select()` call for unit_cost/quantity is also removed since it's no longer needed.

