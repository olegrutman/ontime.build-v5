

# CO System Bug Report — Full Flow Analysis

After tracing the complete GC → TC → FC → TC → GC flow through all hooks, components, and permission logic, here are the bugs found.

---

## Bug 12: TC cannot submit from `work_in_progress` status

**Severity: High**

`canSubmit` on line 354 of `COStatusActions.tsx` allows submit from `draft`, `shared`, `closed_for_pricing`, and `rejected` — but NOT from `work_in_progress`. When the GC sends a CO to TC as WIP (via "Send to TC (Work in Progress)"), the TC lands on a CO in `work_in_progress` status with no submit button. The TC is stuck.

**Fix:** Add `'work_in_progress'` to the `canSubmit` status list.

---

## Bug 13: LaborEntryForm loads rate from `profiles.hourly_rate` instead of `org_settings`

**Severity: Medium**

Lines 50-65 of `LaborEntryForm.tsx` fetch the default rate from `profiles.hourly_rate`. But the org settings (visible in network requests) store `default_hourly_rate: 65` on `org_settings`. If the profile doesn't have `hourly_rate` set, the rate field stays empty and the TC/FC must type it every time. The org_settings rate is the authoritative source but is never used by the form.

**Fix:** Fetch from `org_settings` using `orgId` prop, falling back to `profiles.hourly_rate`.

---

## Bug 14: TC markup not pre-filled from `org_settings.labor_markup_percent`

**Severity: Medium**

The TC markup field starts empty every time. The org has `labor_markup_percent: 15` in `org_settings` but `LaborEntryForm` never loads it. TC users must manually type "15" on every single entry.

**Fix:** Load `labor_markup_percent` from `org_settings` alongside the rate and pre-fill the markup field.

---

## Bug 15: FC `canEdit` is true but `canAddLabor` gates on `isCollaboratorOrg`

**Severity: High**

In `CODetailLayout.tsx` line ~165, `canAddLabor` is passed as `canEdit && (isTC || isFC) && !nteBlocked`. But `canEdit` for FC requires the FC to have an "active" collaborator status (checked in `useCORoleContext`). However, `canEdit` does NOT check `isCollaboratorOrg` — it only checks status + role. An FC who is "invited" but hasn't accepted yet will have `canEdit = true` but the accept banner is shown. They can technically add labor entries before accepting, which is wrong.

**Fix:** Gate `canEdit` for FC behind `isCollaboratorOrg` (FC must be an active collaborator to edit).

---

## Bug 16: `COAcceptBanner` accept updates `accepted_at` but collaborator query doesn't filter on it

**Severity: Low (data hygiene)**

`COAcceptBanner` sets `accepted_at` when accepting, and `rejected_at` when declining. The collaborator query (line 150 of `useChangeOrderDetail`) filters `neq('status', 'removed')` but doesn't use these timestamp columns for anything. The timestamps exist in the DB schema but serve no functional purpose yet — they're written but never read.

**Not a bug per se**, but the `accepted_at`/`rejected_at` fields are vestigial. No action needed unless they're used downstream.

---

## Bug 17: TC submit snapshots `grandTotal` when toggle is OFF, but `grandTotal` already uses `tcBillableToGC`

**Severity: Medium**

In `COStatusActions.tsx` line 222, when `use_fc_pricing_base` is OFF, the TC submit stores `tc_submitted_price = financials.grandTotal`. But `grandTotal` already equals `tcBillableToGC + materials + equipment` (from the bug-2 fix). So `tc_submitted_price` now includes materials and equipment. Later, `tcBillableToGC` checks `if (use_fc_pricing_base && tc_submitted_price > 0)` — this path is skipped when toggle is OFF. But if someone later turns the toggle ON, `tc_submitted_price` would include materials/equipment, inflating the labor number.

**Fix:** When toggle is OFF, snapshot `financials.laborTotal` (labor only) into `tc_submitted_price`, not `grandTotal`.

---

## Bug 18: GC sees "$0 Labor" when no TC entries exist and toggle is ON with `tc_submitted_price = 0`

**Severity: Medium**

`tcBillableToGC` formula: `co.use_fc_pricing_base && co.tc_submitted_price > 0 ? tc_submitted_price : laborTotal`. If the TC hasn't submitted yet but the toggle is ON, `tc_submitted_price` is null or 0, so `tcBillableToGC` falls through to `laborTotal`. This is correct. BUT — if the TC submitted with `tc_submitted_price = 0` (e.g., no FC hours when calculated), the condition `> 0` is false, so it falls to `laborTotal`. If FC hours were logged AFTER submission, `laborTotal` is non-zero but the TC's snapshot is still 0. This is confusing but arguably correct (TC needs to resubmit).

**Not a critical bug** — just a UX gap. Consider showing "TC needs to resubmit" when snapshot is stale.

---

## Bug 19: `COSidebar` `totalApprovedSpend` double-counts labor when toggle is ON

**Severity: Medium**

Line 74 of `COSidebar.tsx`: `totalApprovedSpend = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal`. This is fine. BUT `COBudgetTracker` receives this as the spend against `gc_budget`. When `use_fc_pricing_base` is ON and `tc_submitted_price` is the snapshot value, `tcBillableToGC` uses the snapshot. However, `financials.grandTotal` (used elsewhere) also equals `tcBillableToGC + materials + equipment`. So these are consistent now. **This is actually correct after the earlier fixes.**

---

## Bug 20: `visibleBillable` for TC shows only TC entries, hiding FC entries from the main list

**Severity: Medium**

`COLineItemRow.tsx` line 53: `visibleBillable = isGC ? tcBillable : isFC ? fcBillable : tcBillable`. For TC, `visibleBillable = tcBillable`. FC entries are only shown in a separate "FC cost to TC" section below (line 246). The entry count on line 56 adds both: `entryCount = visibleBillable.length + tcDownstreamCosts.length`. But the collapsible trigger says `{entryCount} entries logged — ${totalForRole}` where `totalForRole = tcTotal` for TC. This means the count includes FC entries but the dollar total does NOT. Confusing: "5 entries logged — $2,482" when 2 of those entries are FC costs not included in the $2,482.

**Fix:** Either separate the counts ("3 TC entries — $2,482 + 2 FC entries — $350") or include FC total in the summary.

---

## Summary of New Bugs

| # | Severity | Bug |
|---|----------|-----|
| 12 | **High** | TC cannot submit from `work_in_progress` status |
| 13 | Medium | Rate loaded from profiles instead of org_settings |
| 14 | Medium | TC markup not pre-filled from org_settings |
| 15 | **High** | FC can edit before accepting collaborator invitation |
| 16 | Low | `accepted_at`/`rejected_at` written but never read |
| 17 | Medium | TC submit snapshots grandTotal (includes materials) into labor price |
| 20 | Medium | Entry count includes FC but total does not for TC view |

### Recommended Fix Order
1. Bug 12 — Unblocks TC workflow entirely
2. Bug 15 — Security: FC should not edit before accepting
3. Bugs 13+14 — UX: Pre-fill rate and markup from org_settings
4. Bug 17 — Data integrity: Snapshot labor-only value
5. Bug 20 — UX: Clarify entry counts for TC

