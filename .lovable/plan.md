

# Fix: GC Material Budget Should Reflect Estimate Total (Not Manual Entry)

## Problem
The Material Budget card we just added for GC shows "Set budget" with a manual edit option. However, the system already auto-populates `material_estimate_total` from approved supplier estimates. The GC should not manually set this value — it should come from the estimate approval flow.

## Solution

**File: `src/components/project/FinancialSignalBar.tsx`**

Update the GC Material Budget card (lines 288-298) to be **read-only**:

- Remove `editable: true` and `onEdit` handler
- Change the label to "Material Budget (from Estimates)"
- When no estimate is approved yet, show "$0" instead of "Set budget"
- Add subtext "From approved estimates" to clarify the source

```typescript
// Before (manual entry)
cards.push({
  label: 'Material Budget',
  value: materialEstimateTotal != null ? fmt(materialEstimateTotal) : 'Set budget',
  editable: true,
  onEdit: () => { ... },
  subtext: materialEstimateTotal != null ? 'Est. supplier costs' : 'Click to set',
});

// After (read-only, from estimates)
cards.push({
  label: 'Material Budget',
  value: fmt(materialEstimateTotal || 0),
  icon: <Package className="h-3.5 w-3.5" />,
  color: (materialEstimateTotal || 0) > 0 ? 'default' : 'amber',
  subtext: 'From approved estimates',
});
```

Also update the visibility condition for the "Supplier Est. vs Orders" card below it: currently gated by `materialEstimate > 0 || materialOrdered > 0`. Since GC's `materialEstimate` comes from `material_estimate_total`, once an estimate is approved the tile and charts will appear automatically. No change needed there.

## No Other Changes Needed

The estimate approval flow in `ProjectEstimatesReview.tsx` and `EstimateApprovals.tsx` already auto-syncs the total of all approved estimates into `material_estimate_total` on the contract. The hook (`useProjectFinancials`) already reads this value. The only change is making the GC card read-only.
