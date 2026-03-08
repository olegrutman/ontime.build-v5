

# Hide "Priced by Supplier" step when skipped

When a supplier skips pricing and marks a PO as ordered directly from SUBMITTED status, the "Priced by Supplier" step shows as "Pending" in the timeline — which is misleading since it was intentionally skipped.

## Fix

**File: `src/components/purchase-orders/POActivityTimeline.tsx`**

Filter out the "Priced by Supplier" step when the PO has reached ORDERED or DELIVERED but was never priced (`priced_at` is null while `ordered_at` exists). This way the timeline only shows steps that actually happened or are still expected.

```tsx
// Before building the steps array, determine if pricing was skipped
const pricingSkipped = !po.priced_at && !!po.ordered_at;

// Then filter the steps array to exclude the pricing step when skipped
const steps = allSteps.filter(s => !(pricingSkipped && s.label === 'Priced by Supplier'));
```

Single file change, no database work needed.

