Targeted fixes for the bugs found on `/project/:id/overview` (GC view). All scoped to presentation; no business-logic changes.

## Fixes

1. **Grammar** — `src/components/project/overview/ProjectHealthHero.tsx` line 141: change `"Set a ${roleLabel} contract…"` → `"Set ${roleLabel === 'owner' ? 'an' : 'a'} ${roleLabel} contract…"` (handles "an owner" / "a GC" / "a TC/GC" cleanly).

2. **Confusing supplier/TC dual rows** — `src/hooks/useProjectReadiness.ts`: relabel the "assigned" / "contract sum entered" rows so they don't read as contradictions with the "Awaiting…" rows.
   - "Supplier assigned" → "Supplier invited"
   - "Contract sum with TC entered" stays (it's a different concept than acceptance), but the "Awaiting TC" row is fine paired with it.

3. **Misleading red on zero / cosmetic tone** — `src/components/project/overview/OverviewSummaryStrip.tsx`:
   - "Paid out to {payable}" row: tone `neg` → `muted` when value is 0, keep `neg` only when > 0.
   - "Margin %" row: when `pctRounded === 0`, force tone `muted` (was `neg` because 0 < 5).

4. **False-positive "healthy" badges with no data** — `src/components/project/BuyerMaterialsAnalyticsSection.tsx`:
   - Card 1 (Forecast at Completion): if `estimateTotal === 0 && committedTotal === 0` → neutral pill "No data" instead of green "On Budget".
   - Card 2 (PO Pipeline): if total POs across pipeline === 0 → neutral pill "No POs" + subtitle "No purchase orders yet" instead of green "Flowing".
   - Card 4 (Delivery Risk): if `avgLeadTimeDays == null && lateCount === 0` → neutral "No data" instead of green "On Time".
   - Card 5 (Returns): if `returnsImpact.deliveredTotal` (or returnRatePct denominator) === 0 → neutral "No data" instead of green 0%.
   - Card 6 (Cash Exposure): if total open commitments + unpaid invoices === 0 → neutral "No data" instead of green "Current".

5. **Project Team subtitle** — `src/components/project/GCProjectOverviewContent.tsx` line 709 (PROJECT TEAM card): drop `Materials: …` from the team-card subtitle. Show member count summary instead (`acceptedTeam.length} accepted · ${pendingTeam.length} invited` or similar). Materials responsibility is already surfaced on its own card.

6. **Apple meta deprecation** — `index.html` line 14: add the modern `<meta name="mobile-web-app-capable" content="yes" />` alongside the legacy apple tag so the deprecation warning clears (keep the apple one for older iOS).

## Out of scope (already correct / non-issues)

- GC Setup % math is accurate (2/7 ≈ 29%). Visual bar uses Radix `Progress` and tracks the value correctly; on re-inspection the visual matches 29% on this viewport.
- Owner Billings form already validates `billed > 0` server-side path.
- Top KPI strip already renders values inside the pills.
- React "Select uncontrolled → controlled" warning origin isn't on this page's main components; deferring to a separate sweep.

## Verification

Re-open `/project/f2d61694-…/overview` in the browser tool after edits, screenshot, and confirm:
- "Set an owner contract…" copy.
- Cash Flow "Paid out … $0" not red.
- Material Buyer Analytics cards show neutral pills (no green) for empty data.
- Project Team subtitle no longer says "Materials: GC_Test".
