# Mobile Dashboard Optimization

## The problem (from your screenshot at 390px)

Looking at the preview, the dashboard *works* on mobile but has a few clear pain points:

1. **Portfolio Insights strip is broken on mobile.** The 3 cards (Contract / Cash Flow / Change Orders) are squished into 3 narrow columns. Numbers are clipping (`$122…`, `$1.2…`, `$2.6K` truncating), labels wrap to 3–4 lines, and the footer text is unreadable. Root cause: `OverviewSummaryStrip` uses an inline `gridTemplateColumns: repeat(3, ...)` which **overrides** the `max-lg:grid-cols-1` className that was supposed to stack them.
2. **Project cards are decent but dense.** 3-column financial row (Contract / Cost / Margin) gets tight on 390px when the numbers are 6 digits.
3. **Compact Health Hero + Summary Strip** stack vertically but together they push the project cards (the focal point) below the fold.
4. **Top header is busy** — logo, bell w/ badge, big yellow `+`, avatar all on one row. Fine, but the `+` button could be smaller.
5. **Bottom nav** eats screen real-estate; content needs the right `pb-` offset (already there in most views, worth verifying).

---

## What I'd change

### 1. Fix the Portfolio Insights cards (highest impact)
- Make `OverviewSummaryStrip` *actually* responsive: switch from inline grid → CSS class + media query, or detect viewport. On `< 640px` stack to **1 column**, on `640–1024` use 2 cols, ≥1024 use 3.
- Inside each card on mobile: reduce label font, allow numbers to wrap to a second line if needed, drop the footer to a smaller muted line (or hide behind a "Why?" tap on mobile).
- Result: numbers stop clipping, labels read in 1–2 lines.

### 2. Move Portfolio Insights into a true accordion on mobile
- It's already collapsible, but **default it to collapsed on mobile** (open on desktop). The mobile user came for projects, not aggregate KPIs — keep them one tap away, not always rendered.

### 3. Tighten the Rich Project Cards on mobile
- On `< 400px`, switch the financial row from 3 columns to a **2-row layout**: top row = Contract + Margin (the two that matter), second row = Cost as a muted sub-line. (For FC with `hideCost`, it's already 2-col.)
- Shrink card padding from `14px 16px` → `12px 14px` on mobile.
- Keep the next-action CTA full width (already good).

### 4. Compact Health Hero — make it even more compact on mobile
- Currently it's a single row but the summary sentence wraps to 3 lines. On mobile, show only **status pill + projected margin $/%**, hide the summary sentence (or truncate to 1 line with `…`). Tap the pill to expand.

### 5. Small polish
- Header `+` button: reduce to icon-only at `< 400px`, keep "New Project" label on desktop.
- Bottom nav: confirm `pb-24` (or your existing offset) is applied on every dashboard view so the last card isn't hidden behind it.

---

## Files I'll touch

- `src/components/project/overview/OverviewSummaryStrip.tsx` — replace inline 3-col grid with responsive CSS class; mobile-aware row sizes/footer.
- `src/components/dashboard/PortfolioInsightsSection.tsx` — default `defaultOpen={!isMobile}` using `useIsMobile`.
- `src/components/dashboard/projects/RichProjectCard.tsx` — responsive 2-row financial layout on narrow widths; tighter mobile padding.
- `src/components/dashboard/overview/CompactHealthHero.tsx` — hide/truncate summary line on mobile.
- `src/components/dashboard/projects/MyProjectsHero.tsx` — shrink "+ New Project" button to icon on narrow.
- (Optional) Spot-check `GCDashboardView` / `TCDashboardView` / `FCDashboardView` for `pb-` offsets.

**Untouched**: data hooks, formulas, role privacy logic, desktop layout (changes are additive via breakpoints).

---

## Out of scope (ask if you want these)
- Redesigning the top header / bottom nav structure.
- Adding a horizontal-swipe carousel for project cards.
- Mobile-specific KPI selection (different KPIs on mobile vs desktop).
- Changing any formulas or business logic.

---

## How you'll know it's better
- Open dashboard at 390px → no clipped numbers anywhere.
- Portfolio Insights collapsed by default; expanding shows a clean stacked list.
- Project cards visible above the fold (after Compact Health Hero one-liner).
- Tap-targets ≥ 40px, no horizontal scroll.

Approve to build, or tell me which of the 5 items to skip.
