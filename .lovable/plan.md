

# Remove Redundant Billing Summary Bars from SOV Page

## What's happening
The SOV page has two levels of billing progress bars:
1. **Section-level billing summary bars** — horizontal bars above each group of SOV cards ("Main Contract Billing: $X of $Y", "GC → TC Billing:", "TC → FC Billing:")
2. **Per-card progress bars** — on each expandable SOV card header (added recently)

Now that each card shows its own progress, the section-level summaries are redundant clutter.

## Changes

### File: `src/components/sov/ContractSOVEditor.tsx`

1. **Remove the "Main Contract Billing" summary bar** (lines 814-825) — the `rounded-lg border bg-muted/30` div with `mainContractBillingTotals`.

2. **Remove the "GC → TC" billing summary bar** (lines 772-783) — same pattern for `gcToTcBilling`.

3. **Remove the "TC → FC" billing summary bar** (lines 794-805) — same pattern for `tcToFcBilling`.

4. **Remove the Work Orders section billing text** (lines 843-846) — the small "Main Contract Billed: $X of $Y" label.

5. **Update SOV card progress bar display** (lines 323-334) to show percentage more prominently:
   - Change the text from `"$X / $Y billed"` to `"X% billed • $X / $Y"`
   - Ensure the progress bar color coding is clear (green = billed portion)

6. **Clean up unused variables** — `gcToTcBilling`, `tcToFcBilling`, `mainContractBillingTotals`, `mainBilledPercent`, and `calcBillingTotals` if no longer referenced elsewhere.

### No other files affected.

