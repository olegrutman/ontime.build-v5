## Why FC's CO detail page still doesn't behave like TC's

Last loop converged the **list page**, **picker steps 1–3**, and **PickerShell submit** for FC parity. But the **detail page** still has many `isTC` / `isFC` branches that hard-code FC-only behavior. The screenshot you sent shows exactly that: FC sees a "Log your hours" banner, 4 FC-only KPI tiles (Hours Logged / Billed to TC / Internal Cost / Margin), and a stripped-down sidebar (My Labor / Total) — none of which mirror TC.

Below is the bug list I found by tracing every FC branch in the CO detail tree. Each item is a real divergence from TC parity (minus the "no downstream FC" exception you defined).

---

### Bugs found

**1. `CONextActionBanner.tsx` (lines 96–107)**
FC's banner is one hardcoded card: *"Log your hours … Submit to TC"*. It ignores status entirely. TC has 4 banners keyed off status (`shared` / `work_in_progress` → request hours + add materials, `closed_for_pricing` → finalize & submit, `submitted` → waiting on GC). FC needs the same banner set, retargeted upstream (TC instead of GC) and with the FC-input request line removed.

**2. `COKPIStrip.tsx` (lines 206–235)**
FC returns a 4-tile FC-only set. TC returns: *FC Cost / My Billable / Materials+Equipment / Total to GC*. For FC parity (no downstream FC), FC should show: *My Labor / Materials / Equipment / Total to TC* — same shape as TC, just dropping the "FC Cost" tile and relabeling "GC" → "TC".

**3. `COSidebar.tsx` Financials block (lines 229–242)**
FC's financials card only renders 2 lines: *My Labor* and *Total*. TC's renders Billable / Equipment / Materials / Total + Tax + Retainage breakdowns. FC should mirror TC's full breakdown, relabeled upstream.

**4. `CODetailLayout.tsx` Scope & Labor totals strip (lines 314–315, 452–454)**
`displayBillable = isTC ? grandTotal : totalLogged` — FC's "Billed to TC" cell only sums labor entries, ignoring materials/equipment FC procures. Should be `grandTotal` for FC too (since FC now manages materials/equipment under "full parity").

**5. `CODetailLayout.tsx` Materials/Equipment gating (lines 535, 551)**
`(co.materials_needed || materials.length > 0 || (isTC && canEdit))` — FC can only see these panels if `materials_needed` was flagged in the wizard. TC sees them whenever they can edit. Change gate to `(isTC || isFC) && canEdit` so FC always has access to add materials/equipment when editable.

**6. `COMaterialsPanel.tsx` FC pricing suppression (lines 191, 471–472)**
`showPricingColumns = isFC ? false : ...` and inserts force `unit_cost: null`, `markup_percent: 0` when FC. That contradicts "FC sees full pricing pane like TC". Should treat FC like TC: show pricing columns when FC is the responsible party for materials, allow real cost+markup entry. (Same correction in `COEquipmentPanel.tsx` lines 137, 145, 262, 308, 323, 367.)

**7. `COStatusActions.tsx` submit amount (lines 92–94)**
`submitAmount = isFC ? fcLaborTotal : grandTotal`. Once FC carries materials/equipment, the amount notified upstream and logged in activity must be `grandTotal` for FC too.

**8. Progress bar annotation (CODetailLayout.tsx line 485)**
`{isTC && totalLogged > 0 && …}` — FC never sees the `$X logged` annotation. Drop the `isTC &&` guard.

**9. `useCORoleContext.ts` `canRequestFCInput` (line 81)**
Hardcoded `isTC`. FC has no downstream FC, so this stays false for FC — that's correct (the "one exception"). No change needed; flagged here for completeness.

---

### What stays FC-only (the "one exception")

- No `FCPricingToggleCard` in sidebar (already gated `isTC` only — keep)
- No `FCInputRequestCard` (already gated `isTC` only — keep)
- No "Request FC Hours" banner action (will be naturally absent when banner #1 fix applies, since the upstream-routing version of TC's banner targets the upstream, not a downstream FC)
- "FC Profitability" label in the profitability card stays (FC's own margin view)

---

### Files to change

```
src/components/change-orders/CONextActionBanner.tsx        (#1)
src/components/change-orders/COKPIStrip.tsx                (#2)
src/components/change-orders/COSidebar.tsx                 (#3)
src/components/change-orders/CODetailLayout.tsx            (#4, #5, #8)
src/components/change-orders/COMaterialsPanel.tsx          (#6)
src/components/change-orders/COEquipmentPanel.tsx          (#6)
src/components/change-orders/COStatusActions.tsx           (#7)
```

No DB changes, no RLS changes, no GC changes, no picker changes (last loop already covered those).

---

### Implementation approach

For each `isTC` branch that builds upstream-facing UI (banners, KPI tiles, financial rows, totals labels, materials/equipment panes), replace the gate with `(isTC || isFC)` and parameterize the upstream label (`isTC ? 'GC' : 'TC'`). For each FC-only early-return / FC-only branch (KPIStrip lines 206–235, NextActionBanner lines 96–107, Sidebar lines 229–242), delete the FC branch entirely so FC falls through to the TC code path with the upstream label swapped.

Submit/notify amounts and progress annotations get the same `(isTC || isFC)` treatment. Materials/Equipment pricing-suppression for FC (`isFC ? false : …`, `isFC ? 0 : …`) is removed so FC enters real costs/markups like TC.

After changes, FC's detail page will render: same banner set (targeting TC), same KPI tile set (My Labor / Materials / Equipment / Total to TC), same financials sidebar, same materials & equipment panes with pricing, same submit flow — with `FCPricingToggleCard` and `FCInputRequestCard` still hidden because those are the "no downstream FC" exception.