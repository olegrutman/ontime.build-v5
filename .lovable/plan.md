

# Add Billing Progress Bar to All SOV Cards

## Problem
Each SOV card header only shows the contract sum and item count text. There is no visual billing progress bar at the SOV card level — the progress bar only appears per-item (when expanded) and in the TC section summaries.

## Change

### `src/components/sov/ContractSOVEditor.tsx`

Add an `SOVProgressBar` to each SOV card header, visible in both collapsed and expanded states. Insert it right after the `CardDescription` line (after line 322), using the existing `totals` object which already has `totalBilled` and `totalScheduled`.

```tsx
{/* After CardDescription, inside the header left side */}
{totals.totalScheduled > 0 && (
  <div className="mt-2 w-48">
    <SOVProgressBar
      scheduledValue={totals.totalScheduled}
      billedToDate={totals.totalBilled}
      showLabels={false}
      size="sm"
    />
    <span className="text-xs text-muted-foreground">
      {formatCurrency(totals.totalBilled)} / {formatCurrency(totals.totalScheduled)} billed
    </span>
  </div>
)}
```

This reuses the existing `getSOVTotals(sov.id)` result already computed at line 288 and the existing `SOVProgressBar` component. One insertion point, no other files affected.

