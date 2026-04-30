
# Per-Pack Variance Card — Bug Audit & Fix

I tested the math against your live project (`ad28bf07…66f53`). Three real bugs and one cosmetic issue.

## What the screenshot shows vs. reality

Screenshot (4 packs, all `+0.0%` / `OK`, all `Estimate $0`):

| Pack | Est shown | Est actual | Ord shown | Variance shown | Real variance |
|---|---|---|---|---|---|
| 1st Floor Framing & Sub-Floor Sheeting | $0 | **$13,993** | $14.2K | +0.0% OK | **+1.4% Watch** |
| Basement Framing | $0 | **$4,684** | $6.0K | +0.0% OK | **+28.1% Over** |
| Walkout | $0 | **$2,172** | $5.0K | +0.0% OK | **+128.7% Over** |
| Ad-hoc | $0 | n/a | $468 | +0.0% OK | n/a |

Only 4 of 15 estimated packs show; the 11 that have estimates but no PO yet are hidden, when they're the most important ones (un-ordered budget).

---

## Bug 1 — Status case mismatch hides ALL estimate values 🔴

`useBuyerMaterialsAnalytics.ts` line ~152:
```ts
.from('supplier_estimates').select('id')
  .eq('project_id', projectId)
  .eq('status', 'approved')   // ← lowercase
```

DB enum is uppercase (`'APPROVED'`, `'DRAFT'`, …). Query returns 0 rows → `estimateIds` empty → no estimate items fetched → every pack's `estimate` stays `0` → every variance % is `0`.

**Fix:** `.eq('status', 'APPROVED')`.

This single fix restores all the actual numbers in the table.

## Bug 2 — Forecast at Completion overrun ratio is mathematically broken 🔴

Lines 191-193:
```ts
const overrunRatio = estimateTotal > 0 && committedTotal > 0
  ? Math.max(0, (committedTotal / estimateTotal) - (committedTotal > 0 ? committedTotal / Math.max(estimateTotal, committedTotal) : 0))
  : 0;
```

- When `committed ≤ estimate`: `max(estimate, committed) = estimate` → expression = `committed/estimate − committed/estimate = 0`. **Always 0.**
- When `committed > estimate`: `(committed/estimate) − 1`. That's the variance on what you've committed, but applied to the *un-committed* portion as if every future buy will overrun by that exact amount — which double-counts the overrun.

Result: FAC essentially equals `estimate` whenever you're under-committed (the normal case mid-project), so the card cannot detect drift until the project is over-spent.

**Fix:** compute overrun against the *expected slice of estimate that committed POs map to*. Two clean options:

**Option A (preferred — uses pack data we already have):**
```ts
// Sum estimate $ for packs that have at least one PO ordered+
const committedPacksEstimate = packs
  .filter(p => p.ordered > 0)
  .reduce((s, p) => s + p.estimate, 0);
const overrunRatio = committedPacksEstimate > 0
  ? Math.max(0, (committedTotal - committedPacksEstimate) / committedPacksEstimate)
  : 0;
const forecastAtCompletion = committedTotal + unCommittedEstimate * (1 + overrunRatio);
```

This means: "POs we've placed are running X% over their slice of the estimate; assume future POs do the same."

**Option B (fallback when no source_pack_name on POs):** use a flat overrun
```ts
const overrunRatio = estimateTotal > 0
  ? Math.max(0, (committedTotal - Math.min(committedTotal, estimateTotal)) / estimateTotal)
  : 0;
```

Use A when `committedPacksEstimate > 0`, else fall back to B.

For your project: $25.2K committed against $20.8K of those-packs estimate → overrun ratio ≈ 21%. FAC ≈ $25.2K + $95.8K × 1.21 ≈ **$141.0K vs budget $116.6K → +20.9% Over**. That's the truth.

## Bug 3 — Ad-hoc POs (no `source_pack_name`) compute misleading 0% variance 🟡

Line 360 buckets POs without a pack into `'Ad-hoc'` with estimate=0. Then line 373's guard returns 0% (`p.estimate > 0` false), so the Ad-hoc row shows `+$468 (+0.0%) OK` — looks fine when it's really 100% over (no estimate at all).

**Fix:** when `estimate === 0 && ordered > 0`, status should be `'over'` (un-budgeted spend) and the variance label should show `(no estimate)` instead of `+0.0%`. Suggested:

```ts
const variancePct = p.estimate > 0 ? (variance / p.estimate) * 100 : null;
const status = p.estimate === 0 && p.ordered > 0 ? 'over'
  : variancePct == null ? 'ok'
  : variancePct > 5 ? 'over' : variancePct > 0 ? 'watch' : 'ok';
```

In the section component, render `variancePct == null ? '(no estimate)' : pctLabel(variancePct)`.

## Bug 4 — Hidden un-ordered packs hide the real risk 🟡

After Bug 1 is fixed, all 15 estimate packs appear. That's correct, but the sort `b.estimate + b.ordered − (a.estimate + a.ordered)` puts the largest at top, which is fine. Add one defensive filter:

```ts
.filter(p => p.estimate > 0 || p.ordered > 0)   // drop empty rows
```

(Won't change anything in your data but prevents future ghost rows from `estimate_packs` rows with 0 items.)

## Bug 5 — Sort tiebreaker (cosmetic) ⚪

`sort((a, b) => b.estimate + b.ordered − (a.estimate + a.ordered))` ranks by sum, which means a $40K-estimate / $0-ordered pack ranks the same as a $20K / $20K pack. Better: rank by `Math.max(estimate, ordered)` so Walkout (most over) sits near the top, not buried.

---

## Files to change

- `src/hooks/useBuyerMaterialsAnalytics.ts` — fix Bugs 1, 2, 3, 4, 5 (all in the pack-variance and FAC sections, ~25 lines)
- `src/components/project/BuyerMaterialsAnalyticsSection.tsx` — handle `variancePct === null` ("no estimate" label) in the per-pack table, ~3 lines

No schema changes. No new queries.

## Expected after-fix behavior on the current project

Per-Pack table (top 5):
| Pack | Estimate | Ordered | Delivered | Variance | Status |
|---|---|---|---|---|---|
| Exterior Siding & Soffit Trim | $39.1K | $0 | $0 | -$39.1K (-100%) | OK (un-ordered) |
| 1st Floor Framing & Sub-Floor Sheeting | $14.0K | $14.2K | $0 | +$195 (+1.4%) | Watch |
| Rake Fascia | $12.7K | $0 | $0 | -$12.7K | OK |
| Basement Framing | $4.7K | $6.0K | $6.0K | +$1.3K (+28%) | Over |
| Walkout | $2.2K | $5.0K | $0 | +$2.8K (+128%) | Over |
| Ad-hoc | — | $468 | $0 | +$468 (no estimate) | Over |

FAC card: **~$141K · +20.9% vs budget · Over** instead of the current misleading "+0.0% On Budget".
