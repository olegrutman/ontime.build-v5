

# Finish Remaining CO Flow Items

Three items left from the approved plan:

## 1. Per-CO "Use FC Input as My Pricing Base" Toggle

**Where**: `CODetailPage.tsx` sidebar, between the FC Input Request card and the Financial card.

**Visible when**: `isTC && collaborators.length > 0` (FC has been invited). Shows a Switch toggle that reads/writes `co.use_fc_pricing_base`.

**What it does**:
- Toggle updates `change_orders.use_fc_pricing_base` via `updateCO` mutation
- When ON and FC has submitted pricing, shows a calculated "Price to GC" preview:
  - **Hourly mode**: FC total hours × TC's `default_hourly_rate` from org_settings
  - **Lump sum mode**: FC lump sum total × (1 + `labor_markup_percent` / 100) from org_settings
- Fetches TC's org_settings once to get the rates (query `org_settings` where `organization_id = myOrgId`)

**Files**: Edit `CODetailPage.tsx` — add a new `FCPricingToggleCard` section in the sidebar.

## 2. Snapshot TC Rates at Submission

**Where**: `COStatusActions.tsx` → `doSubmit()` function.

**Logic**: When TC submits (isTC && toggle is ON):
1. Fetch `org_settings` for TC's org to get `default_hourly_rate` and `labor_markup_percent`
2. Calculate `tc_submitted_price`:
   - If hourly: FC total hours × TC rate
   - If lump sum: FC lump sum total × (1 + markup%)
3. Update CO with snapshot fields: `tc_snapshot_hourly_rate`, `tc_snapshot_markup_percent`, `tc_submitted_price`

**When toggle is OFF**: TC submits manually-entered pricing. `tc_submitted_price = financials.grandTotal`. No snapshot of rates needed.

**Files**: Edit `COStatusActions.tsx` — enhance `doSubmit()`. Pass `co.use_fc_pricing_base` and `financials.fcLaborTotal` (already available via props).

## 3. Automated 80% NTE Warning Notification

**Where**: `LaborEntryForm.tsx` or `useChangeOrderDetail.ts` — after a labor entry is saved.

**Approach**: Client-side check after labor entry insert. In `addLaborEntry` `onSuccess` callback (or in the LaborEntryForm's `onSaved` flow), check if the new running total crosses 80% of `nte_cap`. If so, fire `notifyAllCOParties('NTE_WARNING_80')`. Same for 100% with `NTE_BLOCKED_100`.

**Simpler approach**: Add the check in `CODetailPage.tsx` using a `useEffect` that watches `financials.nteUsedPercent`. When it crosses 80% (and hasn't been notified before — track with a ref), send the notification. This avoids duplicating notification logic in the form.

**Chosen approach**: Add the NTE notification check in `COStatusActions.tsx` or as a utility called from `CODetailPage`. Since notifications are already sent from `COStatusActions`, we'll add a lightweight NTE notification hook in `CODetailPage` that fires once when the threshold is first crossed.

Actually, the cleanest approach: In `LaborEntryForm.tsx` `onSaved`, after the entry is created, check if the new projected total crosses 80% or 100% of NTE and send notifications inline. This is the most reliable trigger point.

**Files**: Edit `LaborEntryForm.tsx` — add post-save NTE threshold check and notification calls.

## Summary of file changes

| File | Change |
|------|--------|
| `CODetailPage.tsx` | Add FC Pricing Toggle card in sidebar (new section for TC when FC is involved) |
| `COStatusActions.tsx` | Enhance `doSubmit()` to snapshot TC rates and calculate `tc_submitted_price` |
| `LaborEntryForm.tsx` | Add post-save NTE 80%/100% notification trigger |

No database changes needed — all columns already exist.

