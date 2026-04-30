
# Buyer Materials KPI Cards — Math Audit

I audited all 6 cards in `BuyerMaterialsAnalyticsSection` against the source data in `useBuyerMaterialsAnalytics`. **5 of 6 cards have real bugs**, ranging from wrong sign conventions to category errors that can mislead decisions.

---

## Card 1 — Forecast at Completion (FAC)

**Bug 1.1 — `unCommittedEstimate` ignores ad-hoc spend (HIGH).**
```ts
const unCommittedEstimate = Math.max(0, estimateTotal - committedTotal);
```
When a buyer issues POs against packs that aren't in the estimate (e.g. discovered scope), `committedTotal` is added but `estimateTotal` is not. The "uncommitted estimate" gets wrongly reduced, which **hides** future spend and under-forecasts FAC.
**Fix:** subtract only the *committed-against-known-estimate* portion:
`unCommittedEstimate = max(0, estimateTotal − committedAgainstKnownEstimate)`.

**Bug 1.2 — FAC ignores ad-hoc commitments after recompute (HIGH).**
After packs are built we know there's `adHocCommitted = committedTotal − committedAgainstKnownEstimate`. The current FAC `committedTotal + unCommittedEstimate × (1+overrun)` already includes adHoc inside `committedTotal`, but `variancePct` then compares it to `estimateTotal` without acknowledging that the ad-hoc dollars were never in the estimate baseline. Result: a buyer who orders entirely off-estimate looks "on budget."
**Fix:** in the explanatory copy and in `remainingHeadroom` either (a) add ad-hoc to a separate "out-of-scope" line, or (b) make the baseline `estimateTotal + adHocCommitted` for variance display.

**Bug 1.3 — FAC vs `remainingHeadroom` sign trap (MEDIUM).**
`remainingHeadroom = estimateTotal − forecastAtCompletion` can be negative, but the UI labels it "Headroom remaining" with a green/red flag — the wording implies it's always ≥ 0. Either rename to "Headroom / (Overrun)" or display `Math.abs` with a directional badge.

---

## Card 2 — PO Pipeline

**Bug 2.1 — `oldestDays` uses wrong timestamp for several stages (HIGH).**
```ts
STAGE_TIMESTAMP_FIELD = { DRAFT:'created_at', SUBMITTED:'submitted_at', PRICED:'priced_at', ORDERED:'ordered_at', ... }
```
The intent is "how long has this PO been **stuck in this stage**." Using `submitted_at` for a PO currently in `PRICED` stage would actually measure time-in-priced... but `priced_at` is the moment it *entered* PRICED, so that's correct. However for `READY_FOR_DELIVERY` we use `ready_for_delivery_at` and for `DELIVERED` we use `delivered_at` — those are correct. **The real bug is `FINALIZED` uses `updated_at`**, which gets touched by any column edit, so age is reset every time someone fixes a typo. Use `finalized_at` if available, else fall back to `delivered_at`.

**Bug 2.2 — Stuck detection only checks SUBMITTED/PRICED (MEDIUM).**
```ts
const stuck = a.pipeline.find(s => (s.key === 'SUBMITTED' || s.key === 'PRICED') && (s.oldestDays||0) > 5);
```
A PO sitting in `READY_FOR_DELIVERY` for 30 days is also a bottleneck (often a yard-pickup that never happened). Extend the bottleneck check to include `READY_FOR_DELIVERY` with a higher threshold (e.g., 10d).

**Bug 2.3 — `oldestDays` count includes FINALIZED stage value as 0 falsely.**
`Math.max(...ages)` with `ages = []` yields `-Infinity`, but we guard with `ages.length`. OK. But `inStage.filter(Boolean)` on falsy timestamps means a stage with all rows missing `tsField` shows `null` — the UI shows `—` which is fine. **No fix needed**, just noting.

---

## Card 3 — Price Drift vs Estimate

**Bug 3.1 — Label is misleading (MEDIUM).**
The card is titled "PRICE DRIFT VS ESTIMATE" but the math is **supplier adjustments vs. originally quoted unit price**, not vs. the estimate. The estimate's unit price and the PO's `original_unit_price` are different things (the latter is the supplier's first quoted price). Rename to "SUPPLIER PRICE ADJUSTMENTS" or compute true estimate-vs-actual (would require joining `supplier_estimate_items.unit_price` to PO lines by SKU).

**Bug 3.2 — Pill logic flips wrong way (LOW).**
```ts
const pvPill = totalAdjustedDelta > 0 ? 'pr' : totalAdjustedDelta < 0 ? 'pg' : 'pm';
```
That's correct (positive delta = paid more = bad). But the sub-label text shows `+$X` for positive, and the pill says "Over" — fine. **Verify** the `'pm'` PillType exists; if not, this throws. (Need to inspect `KpiCard` types.)

**Bug 3.3 — Lines without `original_unit_price` are silently excluded.**
If a supplier's first quote already differed from the estimate, the PO line never gets `price_adjusted_by_supplier=true`, so the entire delta is invisible. Combined with bug 3.1, this makes the card appear "no drift" while the project is actually $XX over estimate.

---

## Card 4 — Delivery Risk

**Bug 4.1 — On-time rate excludes still-open POs (MEDIUM).**
```ts
if (ordered && delivered && maxQuoted != null) { evaluatedForOnTime++; ... }
```
Only delivered POs count toward on-time %. A PO that's 30 days late but undelivered is in `lateList` but not in the denominator. Result: a project with many late-but-undelivered POs can show "100% on-time."
**Fix:** count overdue undelivered POs as `evaluatedForOnTime++` with `onTime=false`.

**Bug 4.2 — Late detection requires `ordered_at`, missing for fast deliveries (LOW).**
If a PO skipped statuses (jumped DRAFT→DELIVERED via manual fix), `ordered_at` may be null and on-time evaluation silently skips it. Fall back to `submitted_at` or `created_at`.

**Bug 4.3 — `avgLeadTimeDays` uses *quoted* lead times only (LOW).**
Card sub copy says "Avg lead time Xd" implying actual delivery time. It's actually **average max quoted lead time**. Either rename or compute from `delivered_at − ordered_at`.

---

## Card 5 — Returns & Waste

**Bug 5.1 — `returnRatePct` denominator wrong (HIGH).**
```ts
const returnRatePct = deliveredTotal > 0 ? (returnedTotal / deliveredTotal) * 100 : 0;
```
`returnedTotal` is summed from **all returns regardless of status** (including `DRAFT`/`REJECTED`/`PENDING`). A draft return inflates the "real cost" picture. Filter to `status IN ('APPROVED','CREDITED')`.

**Bug 5.2 — `netCredit` calculation is double-fallback-prone (MEDIUM).**
```ts
r.net_credit_total ?? (credit_subtotal − restocking_total)
```
If `net_credit_total` is `0` (legitimately zero, e.g. fully restocked), the `??` keeps it. Good. But if the column is `null` for some rows and populated for others, the fallback formula doesn't include taxes or other fees — sums become inconsistent across rows. Either always compute from components or always use the stored column.

**Bug 5.3 — Pill thresholds are arbitrary and not industry-aligned (LOW).**
`>5% red, >2% amber` — construction return rate norms are typically 1-3%. Consider `>3% red, >1% amber`.

---

## Card 6 — Cash Exposure

**Bug 6.1 — "Next 14 days outflow" measures the wrong thing (HIGH).**
```ts
if (daysOld <= 14) next14DaysOutflow += amt;
```
This sums invoices **created in the last 14 days**, not invoices **due in the next 14 days**. The two are not the same — a 30-day-old invoice with NET-30 terms is due *today*, but won't be counted. If invoice `due_date` exists, use `due_date BETWEEN now AND now+14d`. Otherwise compute due as `submitted_at + payment_terms_days`.

**Bug 6.2 — Aging excludes `APPROVED` invoices ambiguously (MEDIUM).**
```ts
if (inv.status === 'PAID' || inv.status === 'DRAFT' || inv.status === 'REJECTED') return;
```
`APPROVED` (waiting to be paid) is included — correct. `SUBMITTED` is included — correct. But `PARTIALLY_PAID` (if used in your status enum) is included with **full** `total_amount`, not the unpaid balance. Subtract `paid_amount` if available.

**Bug 6.3 — `openCommitments` excludes FINALIZED (LOW).**
```ts
['ORDERED','READY_FOR_DELIVERY','DELIVERED'].includes(p.status)
```
A `FINALIZED` PO with no invoice is still a real exposure (supplier expects payment). Add `FINALIZED` unless your finalization step requires payment.

**Bug 6.4 — Aging buckets use submission date, not invoice age from due date (MEDIUM).**
True A/P aging is measured from **due date**, not submission. Otherwise NET-60 invoices look "60+ days late" the moment they're submitted with NET-60 terms. Use `daysPastDue = max(0, today − due_date)` for bucketing.

---

## Pack Variance Table

**Bug 7.1 — Pack name matching is case/whitespace sensitive (HIGH).**
PO `source_pack_name` comes from the wizard, estimate `pack_name` from the upload parser. A trailing space or capitalization difference creates two rows for the same pack. Normalize: `name.trim().toLowerCase()` for the map key, but display the original.

**Bug 7.2 — `variance` doesn't account for delivered partial overruns (LOW).**
Variance is `ordered − estimate` but doesn't surface the case where `delivered > ordered` (returns/refusals) or `delivered < ordered` (in transit). Add a "% delivered" sub-column.

**Bug 7.3 — Sort buries small-but-critical packs (LOW).**
Sorting by `Math.max(estimate, ordered)` desc means a $500 pack 200% over budget appears below a $50k pack that's on budget. Add a secondary sort by `|variancePct|` desc within status groups.

---

## Proposed Fix Plan (Priority Order)

1. **Pack name normalization** (bug 7.1) — single line fix, unlocks accurate per-pack data.
2. **Returns rate denominator + status filter** (bug 5.1) — prevents drafts inflating waste.
3. **On-time rate includes overdue** (bug 4.1) — flips false-positive "100% on-time" into honest number.
4. **`unCommittedEstimate` uses known-estimate committed** (bug 1.1) — fixes FAC under-forecast.
5. **Cash next-14d uses due dates** (bug 6.1) + **aging from due_date** (bug 6.4).
6. **Card 3 rename + true estimate-vs-actual** (bugs 3.1, 3.3) — significant refactor; could be follow-up.
7. **Pipeline FINALIZED uses `finalized_at`** (bug 2.1) + **bottleneck includes READY_FOR_DELIVERY** (bug 2.2).
8. UI/labeling polish (bugs 1.3, 4.3, 5.3).

## Files Affected

- `src/hooks/useBuyerMaterialsAnalytics.ts` — calculation fixes
- `src/components/project/BuyerMaterialsAnalyticsSection.tsx` — labels, sort, pill thresholds

## Open Questions

- Do invoices have a `due_date` column or do we derive it from `payment_terms_days`?
- Does the PO status enum include `PARTIALLY_PAID` and a `paid_amount` field?
- Is there a `finalized_at` column on `purchase_orders`?

I'll confirm these via a quick schema read before implementing if you approve the plan.
