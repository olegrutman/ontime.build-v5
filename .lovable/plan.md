

# Fix: FC Pricing Toggle Calculation

## Problems

1. **Hourly calculation is wrong** — line 681 computes `fcTotal * (rate / rate)` = `fcTotal`, which just returns FC's dollar amount unchanged. The spec says: TC price = FC's **hours** × TC's rate. But `fcLaborTotal` is FC's **dollar total**, not hours.

2. **No FC hours tracked in financials** — `COFinancials` has `fcLaborTotal` (dollars) but no `fcTotalHours`. The component needs access to FC's actual hours to do hourly pricing.

3. **`laborEntries` not passed to `FCPricingToggleCard`** — the component only receives `financials`, so it can't compute FC hours from raw entries.

## Fix

### 1. Add `fcTotalHours` to `COFinancials` (in `useChangeOrderDetail.ts`)
Compute total FC hours from billable labor entries where `entered_by_role === 'FC'` and `pricing_mode === 'hourly'`:
```
fcTotalHours = sum of entry.hours for FC hourly entries
fcLumpSumTotal = sum of entry.line_total for FC lump_sum entries
```
Add both to the `COFinancials` interface in `changeOrder.ts`.

### 2. Fix `FCPricingToggleCard` calculation (in `CODetailPage.tsx`)
- **Hourly mode** (`tm`/`nte`): `calculatedPrice = fcTotalHours × rate`
- **Lump sum mode** (`fixed`): `calculatedPrice = fcLumpSumTotal × (1 + markup/100)`
- Show the correct breakdown: "X hrs × $Y/hr" for hourly, "FC total × (1 + Z%)" for lump sum

### Files changed

| File | Change |
|------|--------|
| `src/types/changeOrder.ts` | Add `fcTotalHours` and `fcLumpSumTotal` to `COFinancials` |
| `src/hooks/useChangeOrderDetail.ts` | Compute `fcTotalHours` and `fcLumpSumTotal` from FC labor entries |
| `src/components/change-orders/CODetailPage.tsx` | Fix `FCPricingToggleCard` to use correct hourly/lump sum formulas |

No database changes needed.

