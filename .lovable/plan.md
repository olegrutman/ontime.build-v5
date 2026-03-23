

# Bug Report & Fix Plan: CO Detail — Material Pricing Leak, Missing Profit Margin, FC Pricing Base

## Bugs Found

### Bug 1: TC sees material/equipment AMOUNTS in hero KPI cards and table even when GC is responsible

**Hero KPI cards** (lines 267-278): The Materials and Equipment KPI cards show whenever `co.materials_needed` / `co.equipment_needed` is true — no check on `materials_responsible` or `equipment_responsible`. The TC sees "$2,256.48" for materials even though GC is the responsible party.

**Materials table Amount column** (lines 708, 750): The "Amount" column renders for all non-FC users (`!isFC`), which means TC sees the billed amount per row even when `materialsResponsible !== 'TC'`. The `showPricingColumns` correctly hides unit cost and markup, but Amount leaks through separately.

**Materials footer Total** (lines 880-903): The Total row at the bottom of the materials table shows for all non-FC users (`!isFC`), leaking the total cost to TC when GC is responsible.

### Bug 2: TC cannot see their profit margin on the CO

The Financial sidebar for TC (lines 437-462) shows FC cost, TC labor, and reviewed total — but there's no profit margin line. The hook already calculates `financials.profitMargin` and `financials.actualCostTotal`, but neither is displayed in the TC financial section.

### Bug 3: FC Pricing Base toggle doesn't actually affect the submitted price

The `FCPricingToggleCard` (lines 652-771) toggles `use_fc_pricing_base` on the CO and shows a calculated price. But:
- When `isOn && fcHasSubmitted`, it computes `calculatedPrice` but **never writes it back** to `tc_submitted_price` or any field that the submission flow reads
- The calculation uses `financials.fcTotalHours` which only counts `pricing_mode === 'hourly'` entries from FC — but for a **Fixed price** CO, FC entries may be lump_sum, so `fcHours` would be 0 and the hourly calculation would produce $0
- For Fixed price COs, the code uses `fcLumpSum * (1 + markup / 100)` which is correct, but `isHourly` check on line 683 treats only `tm` and `nte` as hourly — Fixed price falls through to lump sum path, which is correct
- The real issue: the calculated price is display-only and never persisted. When TC submits, the submission flow doesn't read `use_fc_pricing_base` to compute the price

## Fixes

### File: `src/components/change-orders/CODetailPage.tsx`

**Fix 1 — Hero KPI cards (lines 267-278):**
Gate Materials and Equipment KPI cards by responsibility for TC:
```tsx
{co.materials_needed && (!isTC || co.materials_responsible === 'TC') && (
  <div className="co-light-kpi">...</div>
)}
{co.equipment_needed && (!isTC || co.equipment_responsible === 'TC') && (
  <div className="co-light-kpi">...</div>
)}
```

Update Grand Total (line 281) to also exclude non-responsible costs for TC.

**Fix 2 — Add profit margin to TC Financial sidebar (after line 458):**
```tsx
{financials.fcLaborTotal > 0 && (
  <div className="flex items-center justify-between text-xs mt-1">
    <span className="text-muted-foreground">Margin</span>
    <span className="font-medium text-foreground">
      {fmtCurrency(tcReviewedTotal - financials.fcLaborTotal)}
      {tcReviewedTotal > 0 && ` (${((tcReviewedTotal - financials.fcLaborTotal) / tcReviewedTotal * 100).toFixed(1)}%)`}
    </span>
  </div>
)}
```

**Fix 3 — FC Pricing Base: persist calculated price on toggle/change:**
Update `FCPricingToggleCard` to write `tc_submitted_price` when the toggle is ON and FC has submitted. Add an effect or update the toggle handler to persist `calculatedPrice` to the CO.

### File: `src/components/change-orders/COMaterialsPanel.tsx`

**Fix 4 — Amount column visibility (lines 708, 750, 843, 880):**
Change `!isFC` to `showPricingColumns || isGC` — the Amount column should only show when the user has pricing visibility. Since `showPricingColumns` already encodes the correct logic (GC always, TC only if responsible, FC never), use it for the Amount column too:
```tsx
{showPricingColumns && <th className="text-right px-4 py-2 font-medium">Amount</th>}
// ... and in the body:
{showPricingColumns && <td>...</td>}
```

Also gate the footer Total section (line 880) with `showPricingColumns` instead of `!isFC`.

## Files changed

| File | Change |
|------|--------|
| `src/components/change-orders/CODetailPage.tsx` | Gate hero KPI by responsibility, add TC profit margin, persist FC pricing base calculation |
| `src/components/change-orders/COMaterialsPanel.tsx` | Gate Amount column and footer Total by `showPricingColumns` |

