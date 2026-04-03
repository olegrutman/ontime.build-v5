

# CO System Audit — Bugs Found

After reviewing all CO formulas, permissions, and role logic across the codebase, here are the issues discovered:

---

## Bug 1: `tcBillableToGC` formula double-counts or ignores TC labor

**File:** `useChangeOrderDetail.ts` line 179-181

When `use_fc_pricing_base` is ON and `tc_submitted_price > 0`, `tcBillableToGC` uses the snapshot price. But when it's OFF, it falls back to `tcLaborTotal` — which only includes TC-entered labor entries. If a CO has **only FC entries** (no TC entries) and the toggle is OFF, `tcBillableToGC = 0` even though work was done. The GC KPI "Labor billed" shows $0.

**Fix:** When toggle is OFF, `tcBillableToGC` should be `laborTotal` (TC + FC combined), not just `tcLaborTotal`.

---

## Bug 2: `grandTotal` always sums TC + FC labor, causing inflated totals

**File:** `useChangeOrderDetail.ts` line 182

`grandTotal = laborTotal + materialsTotal + equipmentTotal` where `laborTotal = tcLaborTotal + fcLaborTotal`. This double-counts when FC pricing is used as TC's base — the TC submitted price already incorporates FC hours. The GC sees an inflated grand total.

**Fix:** `grandTotal` should use `tcBillableToGC` (not raw `laborTotal`) when calculating the total visible to GC. Alternatively, compute separate role-specific grand totals.

---

## Bug 3: `nteUsedPercent` uses `grandTotal` instead of `laborTotal`

**File:** `useChangeOrderDetail.ts` line 185

NTE caps track labor spend, but `nteUsedPercent` divides `grandTotal` (which includes materials + equipment) by `nte_cap`. This inflates the NTE percentage and can block labor entry prematurely.

**Fix:** Use `laborTotal` for NTE percentage, not `grandTotal`.

---

## Bug 4: TC profitability costs include `actualCostTotal` from ALL roles

**File:** `COProfitabilityCard.tsx` line 26

TC costs = `fcLaborTotal + actualCostTotal`. But `actualCostTotal` aggregates actual-cost entries from both TC and FC. If FC logs private actual costs, those appear in TC's profitability card — leaking private data.

**Fix:** Split actual costs by role: TC profitability should use only TC actual-cost entries, FC profitability only FC actual-cost entries.

---

## Bug 5: FC sees TC actual-cost entries in `COLineItemRow`

**File:** `COLineItemRow.tsx` lines 191-217 and 220-234

The `actualCosts` array is unfiltered by role — it includes all `is_actual_cost` entries regardless of `entered_by_role`. An FC user can see TC's private actual cost entries, and vice versa.

**Fix:** Filter `actualCosts` by the current user's role: FC sees only `entered_by_role === 'FC'` actual costs, TC sees only `entered_by_role === 'TC'` actual costs.

---

## Bug 6: GC can see actual-cost entries in labor list

**File:** `COLineItemRow.tsx` line 51

`visibleBillable = isGC ? tcBillable : ...` correctly filters billable entries, but actual-cost entries are only guarded by `isFC` and `isTC` checks in the render. However, the labor entries query returns ALL entries (including actual costs) to all participants via RLS `can_access_change_order`. GC doesn't render actual costs in the UI, but the data is still fetched and available in the client.

**Fix:** Either add RLS to hide `is_actual_cost` entries from non-owning orgs (preferred), or filter them out in the query.

---

## Bug 7: `COSOVPanel` renders for FC despite early return

**File:** `COSOVPanel.tsx` line 33 vs 50

Line 33: `if (!isGC && !isTC) return null;` — FC users should never see this panel. But line 50 has an FC-specific filter `isFC ? items.filter(...)`, which is dead code. This is not a runtime bug but indicates confused logic — if the early return is removed later, FC would see SOV items.

**Fix:** Remove the dead `isFC` branch on line 50.

---

## Bug 8: `useCOResponsibility` updates wrong column names

**File:** `useCOResponsibility.ts` lines 63-64

The mutation patches `co_material_responsible_override` and `co_equipment_responsible_override`, but the CO table columns are `co_material_responsible_override` and `co_equipment_responsible_override`. Need to verify column names match exactly.

**Fix:** Confirm column names in the database match the patch keys. (Verified: columns exist as `co_material_responsible_override` and `co_equipment_responsible_override` — this is correct.)

---

## Bug 9: `canSubmit` allows FC non-collaborator to submit

**File:** `COStatusActions.tsx` line 354

`canSubmit = (isTC || isFC) && !isCollaborator && (status === 'draft' || ...)`. An FC who created their own CO (not a collaborator) can submit, but there's no check that the CO has an `assigned_to_org_id`. The submit handler checks this, but the button still renders — confusing UX.

**Fix:** Add `&& !!co.assigned_to_org_id` to `canSubmit` condition, or at minimum for FC-created COs.

---

## Bug 10: GC approval notification goes to wrong org

**File:** `COStatusActions.tsx` line 260

After GC approves, notification is sent to `co.assigned_to_org_id` (the TC). But if the GC IS the `org_id` (creator) and the TC is `assigned_to_org_id`, this is correct. However, FC collaborators are not notified of approval.

**Fix:** Use `notifyAllCOParties` instead of `notifyOrg` for approval/rejection so FC collaborators are informed.

---

## Bug 11: `LaborEntryForm` markup not saved to database

**File:** `LaborEntryForm.tsx` line 112-124

The TC markup percentage is calculated client-side for display but is **never persisted** to the database. The insert only saves `hours`, `hourly_rate`, `lump_sum`. The markup is lost — `line_total` (generated column) only computes `hours * hourly_rate` or `lump_sum`, not including markup.

**Fix:** Either store markup in a dedicated column on `co_labor_entries`, or compute markup at the CO level rather than per-entry.

---

## Summary

| # | Severity | Bug |
|---|----------|-----|
| 1 | High | `tcBillableToGC` shows $0 when toggle off + only FC entries |
| 2 | High | `grandTotal` double-counts FC+TC labor |
| 3 | Medium | NTE % includes materials/equipment |
| 4 | High | TC profitability leaks FC actual costs |
| 5 | High | Actual costs visible cross-role in line items |
| 6 | Medium | GC fetches actual-cost data (data leak) |
| 7 | Low | Dead FC branch in SOV panel |
| 8 | N/A | Column names verified correct |
| 9 | Low | Submit button shows without assigned org |
| 10 | Medium | FC collaborators not notified on approve/reject |
| 11 | High | TC markup not persisted to database |

