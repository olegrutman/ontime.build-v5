

# Fix FC Pricing Base Toggle Logic

## Problem
Two issues with current pricing logic:

1. **Toggle OFF**: `tcBillableToGC` falls back to `laborTotal` (TC + FC combined). It should use **only TC's own labor** (`tcLaborTotal`). The FC's hours/dollars should not affect the GC price when the toggle is off.

2. **Toggle ON**: The calculation already does `fcHours * TC rate` for hourly — this is correct. But the `tcBillableToGC` in `useChangeOrderDetail.ts` falls back to the combined `laborTotal` when `tc_submitted_price` hasn't been persisted yet, which is wrong.

## Changes

### 1. `src/hooks/useChangeOrderDetail.ts` (line 179-182)
Change the fallback when toggle is OFF from `laborTotal` to `tcLaborTotal`:

```typescript
const tcBillableToGC = co?.use_fc_pricing_base && co?.tc_submitted_price && co.tc_submitted_price > 0
  ? co.tc_submitted_price
  : tcLaborTotal;  // was: laborTotal — only TC's own hours price to GC
```

### 2. `src/components/change-orders/FCPricingToggleCard.tsx`
- The hourly path (`fcHours * rate`) is already correct — FC hours times TC's rate.
- The lump sum path (`fcLumpSum * (1 + markup / 100)`) applies markup to FC's lump sum total — keep as-is for lump sum work orders.
- Update the helper text when toggle is OFF to clarify: "only your own logged hours will be used for pricing to {gcSideName}."

### 3. Update `grandTotal` calculation
`grandTotal` already uses `tcBillableToGC`, so fixing that variable automatically fixes the grand total. No additional change needed.

## Summary
One-line fix in `useChangeOrderDetail.ts` changes the fallback from combined labor to TC-only labor. This ensures FC hours only affect GC pricing when the toggle is explicitly ON.

