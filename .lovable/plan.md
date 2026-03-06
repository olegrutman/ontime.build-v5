

# Add "% Realized" to TC Profit Position Card

## What
Show what percentage of the projected labor margin has already been realized, calculated as:

```
% Realized = (Net Position / Labor Margin) × 100
```

Where **Net Position** = `receivablesInvoiced - payablesInvoiced` (same value shown in Billing & Cash Position card).

## Changes

### `src/components/project/ProfitCard.tsx`

In the TC Profit section (both the non-material-responsible and material-responsible branches):

1. Destructure `receivablesInvoiced` and `payablesInvoiced` from `financials` (already available on the prop).
2. Compute `netPosition = receivablesInvoiced - payablesInvoiced`.
3. Compute `realizedPct = laborMargin > 0 ? (netPosition / laborMargin) * 100 : 0`.
4. Add a row below the "Labor Margin" line showing:
   - Label: "Realized" (or "% Realized")
   - Value: `fmt(netPosition)` with the percentage beside it, e.g. `$45K (62.3%)`
   - Color: green if positive, red if negative

No other files need changes — all required data is already on the `financials` object passed as a prop.

