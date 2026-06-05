## Goal
On every dashboard and project-overview screen, the KPI card grid should never leave a half-empty last row (e.g. 6 cards in a 4-col grid → row of 4 + row of 2 with gap). Always pack rows fully.

## Approach
Upgrade the shared `KpiGrid` so it picks a column count based on the actual number of visible children, instead of hardcoding 4. All call sites already use `<KpiGrid>` so a single change cascades everywhere.

### Logic
Count React children at render time, then choose `lg` columns from a divisor table that produces a full final row:

```text
1 child  → 1 col
2        → 2
3        → 3
4        → 4
5        → 5 (single full row at lg)
6        → 3   (2 rows of 3, no gap)
7        → 4   (4 + 3, last row stretches via auto-fit fallback)
8        → 4
9        → 3
10       → 5
11–12    → 4
default  → 4
```

For counts that don't divide cleanly (5, 7, 11…), apply a CSS fallback: the last row's items use `flex: 1` via a `grid-template-columns: repeat(auto-fit, minmax(0, 1fr))` wrapper on the last row only — implemented by giving the final orphan card(s) `col-span` adjustments so they stretch to fill the row.

Simplest implementation that matches user intent (no empty space):
- Compute `cols` from child count using the table above.
- If `childCount % cols !== 0`, give the last `(childCount % cols)` children an inline `gridColumn: span Math.floor(cols / remainder)` so they expand to fill the trailing row.

### Responsive behavior (unchanged ladder)
- mobile: 1 col
- sm: 2 cols
- lg: computed cols (capped at child count)

### Files to change
- `src/components/shared/KpiGrid.tsx` — add child-count logic + last-row stretch.

No call-site changes needed. The 10 existing `<KpiGrid>` usages (GC/TC/FC/Supplier dashboards + project overviews + analytics sections) automatically get balanced rows.

### Out of scope
- `OverviewSummaryStrip.tsx` and other grids that aren't `KpiGrid` — leave alone unless they exhibit the same issue (they currently use 3-col which already fits their content).
- No business logic, data, or card content changes.

### Verification
After the change, screenshot the Supplier project overview (6 cards → 3×2 grid, no empty space) and Supplier dashboard analytics sections at desktop width to confirm the last row is full.