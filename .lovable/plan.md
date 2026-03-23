

# Fix: FC Pricing Base — Price to GC Not Reflected in Financials

## The Bug

When the FC Pricing Base toggle is ON, the calculated price ($4,745 = 73 hrs × $65/hr) is correctly shown in the Pricing Base card and persisted to `tc_submitted_price`. However, the hero KPI cards and Financial sidebar both read from `tcLaborTotal` (sum of TC labor entries = $2,555), ignoring the pricing base override entirely.

This means:
- TC sees "$2,555" as their labor in the hero and sidebar, but "$4,745 Price to GC" in the pricing base card — contradictory
- GC would see "$2,555" as Labor — which is the TC's internal cost, not the price the TC is charging
- The grand total is wrong for both roles

## Root Cause

`tcLaborTotal` is computed in `useChangeOrderDetail.ts` purely from labor entries where `entered_by_role === 'TC'`. When FC Pricing Base is ON, the TC's price to GC should be `co.tc_submitted_price` (the calculated/overridden amount), but this field is never read into the financials.

## Fix

### File: `src/hooks/useChangeOrderDetail.ts`

Add a new derived field `tcBillableToGC` to `COFinancials`:
- If `co.use_fc_pricing_base === true` AND `co.tc_submitted_price > 0`: `tcBillableToGC = co.tc_submitted_price`
- Otherwise: `tcBillableToGC = tcLaborTotal`

This keeps `tcLaborTotal` as the TC's internal labor cost (for margin calculation) while providing a separate billable amount for display.

### File: `src/types/changeOrder.ts`

Add `tcBillableToGC: number` to the `COFinancials` interface.

### File: `src/components/change-orders/CODetailPage.tsx`

**Hero KPIs (line 282):**
- GC view: Use `financials.tcBillableToGC` instead of `financials.tcLaborTotal`
- TC view: Show `financials.tcBillableToGC` as the labor KPI (this is what they're billing)
- Grand total (lines 305-309): Use `tcBillableToGC` instead of `tcLaborTotal`

**Financial sidebar (lines 469-502):**
- TC section: Show `tcBillableToGC` as the billable labor line
- Keep `fcLaborTotal` as "FC cost" (unchanged — that's TC's cost basis)
- Margin calculation: `tcBillableToGC - fcLaborTotal` (billable minus cost)
- Reviewed total: Use `tcBillableToGC` + materials + equipment

**GC Financial sidebar (lines 458-466):**
- Use `tcBillableToGC` for "Labor" line and total

| File | Change |
|------|--------|
| `src/types/changeOrder.ts` | Add `tcBillableToGC` to `COFinancials` |
| `src/hooks/useChangeOrderDetail.ts` | Compute `tcBillableToGC` from `tc_submitted_price` when pricing base is ON |
| `src/components/change-orders/CODetailPage.tsx` | Use `tcBillableToGC` in hero KPIs, GC financials, TC financials, and grand total |

