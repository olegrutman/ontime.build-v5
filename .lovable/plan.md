

# Fix: Material Budget from Estimate Sum + Manual Override

## Problem
1. The approved estimate ($59,515.98) exists but `material_estimate_total` is null on all contracts -- the sync during approval didn't persist
2. The GC Material Budget card is currently read-only with no way to override
3. Designated suppliers have no ability to set the budget

## Solution

### 1. Hook: Auto-populate from approved estimates when `material_estimate_total` is null

**File: `src/hooks/useProjectFinancials.ts`**

After detecting `isGCMaterialResponsible` (line 175-184), if `material_estimate_total` is still null, fetch the sum of approved estimates for the project and use that as the display value. This ensures the tile shows the correct number even if the sync during approval failed.

Add a new state `approvedEstimateSum` that is fetched separately:

```typescript
// After line 184, add:
// Fetch approved estimate sum as fallback for material budget
if ((detectedRole === 'General Contractor' || detectedRole === 'Trade Contractor') && 
    (isGCMatResp || isTCMatResp)) {
  const { data: approvedEsts } = await supabase
    .from('supplier_estimates')
    .select('total_amount')
    .eq('project_id', projectId)
    .eq('status', 'APPROVED');
  const estSum = (approvedEsts || []).reduce((s, e) => s + (e.total_amount || 0), 0);
  // Use material_estimate_total if set (manual override), otherwise use estimate sum
  if (materialEstTotalValue == null && estSum > 0) {
    setMaterialEstimateTotal(null); // keep null to show "from estimates"
    setMaterialEstimate(estSum);
  }
}
```

Also expose `approvedEstimateSum` in the return so the UI can show the source.

### 2. GC Material Budget card: Make editable with estimate as default

**File: `src/components/project/FinancialSignalBar.tsx`**

Update the GC Material Budget card (lines 288-296) to:
- Show the approved estimate sum as the value (from `materialEstimate` which falls back to the estimate sum)
- Make it editable so GC can manually override via the same edit overlay used by TC
- Show subtext indicating whether value is "From approved estimates" or "Manual override"

```typescript
if (isGCMaterialResponsible && !hideMaterialCards) {
  const budgetValue = materialEstimateTotal ?? materialEstimate;
  cards.push({
    label: 'Material Budget',
    value: fmt(budgetValue || 0),
    icon: <Package className="h-3.5 w-3.5" />,
    color: budgetValue > 0 ? 'default' : 'amber',
    editable: true,
    onEdit: () => { setMatBudgetValue(budgetValue || 0); setEditingMatBudget(true); },
    subtext: materialEstimateTotal != null ? 'Manual override' : 'From approved estimates',
  });
}
```

### 3. Material budget edit overlay: Support GC contract

**File: `src/components/project/FinancialSignalBar.tsx`**

The existing `editingMatBudget` overlay (line 173) uses `upstreamContract.id` for the save. This already works for GC since `upstreamContract` is the GC-TC contract that holds `material_responsibility`. No change needed here -- the overlay already works for both TC and GC.

### 4. Fix the `materialEstimate` fallback for GC

**File: `src/hooks/useProjectFinancials.ts`**

The `materialContract` finder at line 205-210 only scopes to TC orgs when `detectedRole === 'Trade Contractor'`. For GC, it uses `: true` which should work. But if `material_estimate_total` is null (current state), it falls back to `matEstimate` (sum of WO material_total), which may be 0.

Update the fallback: when `material_estimate_total` is null and role is GC/TC with material responsibility, query the approved estimate sum directly.

### 5. Designated Supplier budget setting (future-ready)

Add a `designatedSupplierBudget` capability: when the viewer is a designated supplier for the project, allow them to see and edit the material budget. This requires:

- In `useProjectFinancials`, detect if the current user is a designated supplier for the project
- If so, expose the material budget card with edit capability
- The designated supplier uses the same `updateMaterialEstimate` function targeting the material-responsible contract

**File: `src/hooks/useProjectFinancials.ts`**
- Add `isDesignatedSupplier: boolean` to the interface and return
- After role detection, check `project_designated_suppliers` for the user
- If found and active, set the flag

**File: `src/components/project/FinancialSignalBar.tsx`**
- In the Supplier section, if `isDesignatedSupplier` is true, add a "Material Budget" editable card

## Technical Summary

| File | Change |
|------|--------|
| `src/hooks/useProjectFinancials.ts` | Add approved estimate sum fetch as fallback; add `isDesignatedSupplier` detection; expose new fields |
| `src/components/project/FinancialSignalBar.tsx` | Make GC Material Budget editable; add designated supplier budget card |

