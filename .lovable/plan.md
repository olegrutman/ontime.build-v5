

# Fix: GC Material Budget and Estimate vs Orders Visibility

## Problem
When GC is designated as material-responsible, they cannot see the "Estimates vs Orders" tile or financial health charts because:
1. GC has no way to set a material budget (only TC gets an editable "Material Budget" card)
2. Without a budget set (`material_estimate_total` is null) and no POs in ORDERED+ status, both `materialEstimate` and `materialOrdered` are 0
3. The cards are gated by `(materialEstimate > 0 || materialOrdered > 0)`, so nothing renders
4. The hook only tracks `isTCMaterialResponsible` -- there is no equivalent flag for GC

## Solution

### 1. Add `isGCMaterialResponsible` flag to `useProjectFinancials`

**File: `src/hooks/useProjectFinancials.ts`**

- Add `isGCMaterialResponsible: boolean` to the `ProjectFinancials` interface
- In the fetch logic (around line 162), add a parallel check for GC:
  - When `detectedRole === 'General Contractor'`, look for a contract where `material_responsibility === 'GC'` and the user's org is a party
  - Set the flag and load `material_estimate_total` if available
- Return the new flag

### 2. Add "Material Budget" editable card for GC in FinancialSignalBar

**File: `src/components/project/FinancialSignalBar.tsx`**

- Destructure `isGCMaterialResponsible` from financials
- In the GC section (line 276+), add a "Material Budget" card when `isGCMaterialResponsible && !hideMaterialCards`:
  - Shows the current budget or "Set budget" prompt
  - Editable, triggers the same material budget edit overlay already built for TC
- This mirrors the existing TC behavior (lines 232-241)

### 3. Ensure FinancialHealthCharts renders for GC with material data

**File: `src/components/project/FinancialHealthCharts.tsx`**

- The chart at line 25 already checks for `(viewerRole === 'Trade Contractor' || viewerRole === 'General Contractor')` -- this is correct
- Once the GC can set a budget, `materialEstimate` will be > 0 and the chart will appear automatically
- No changes needed here

## Technical Details

- The `upstreamContract` derived value in the hook (line 273) already finds the GC-TC primary contract, which is the same contract that holds `material_responsibility` and `material_estimate_total`
- The `updateMaterialEstimate` function already works for any contract ID, so it can be reused for GC
- The `materialEstimate` state setter at line 199 already has a fallback path -- the GC budget will be picked up via `materialContract` once `material_estimate_total` is set
