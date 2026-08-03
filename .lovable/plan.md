# Supplier Project Overview — Rework

The page currently opens with 12 near-identical collapsed KPI cards ("Expand for detail"), most reading `$0` because this project only has an estimate. A supplier has to expand each one to learn anything, and the one thing that matters — "$345K estimated, nothing ordered yet, go create the order" — is nowhere prominent.

## What changes

### 1. Lead with one snapshot card, not six

Replace the top 6-card grid with a single wide **Project Snapshot** card at the top, reusing the funnel treatment already shipped on the supplier dashboard:

- Project name, supplier name, risk pill.
- Two headline numbers: Ordered and Outstanding.
- Estimated → Ordered → Billed → Received funnel bars with drop-off labels between stages (`-$345.0K unordered`, `-$X not billed`, `-$X awaiting payment`).
- Footer strip: over-estimate amount, days since last payment, upcoming deliveries.

```text
┌──────────────────────────────────────────────────────────────┐
│ Main Street Apartments  ● On Track      Ordered $0           │
│ Supplier · Ontime System Supplier       Outstanding $0       │
│ Estimated ████████████████████████  $345.0K  100%           │
│             ↓ -$345.0K unordered                             │
│ Ordered   ▏                          $0        0%            │
│ Billed    ▏                          $0        0%            │
│ Received  ▏                          $0        0%            │
│ Over estimate — · Last payment — · Deliveries —              │
└──────────────────────────────────────────────────────────────┘
```

### 2. Collapse the zero cards into a compact strip

Cards whose value is zero/empty stop occupying a full card. They render as a single dense row of small stat tiles (Ordered, Deliveries, Billed, Received, Outstanding) that link to their tab. Only cards with real data keep the full expandable KPI treatment. On this project that turns 6 big empty cards into one thin strip plus the snapshot.

### 3. Analytics section becomes opt-in

The "Project Analytics" block (6 more cards: sell-through, A/R aging, delivery ops, returns, pricing, demand) collapses behind a single header row — `▸ Project Analytics · sell-through, A/R, ops, returns, margin, demand` — expanded on click, collapsed by default. Its cards then render as they do today. Same for the existing Activity Timeline (already collapsible).

### 4. Real empty states with the next action

Where a stage has no data, the sub-line becomes an instruction plus a button instead of "No orders":
- No estimate → "Add an estimate to set the material budget" → Estimates tab.
- Estimate but nothing ordered → "Nothing ordered against $345.0K estimate" → Purchase Orders tab.
- Ordered but nothing billed → "$X ready to invoice" → Invoices tab.

### 5. Tighter header

The duplicated project-name header (dark hero already shows it) becomes a single action bar: supplier name on the left, the existing Price POs / Submit Invoice / Estimates buttons on the right.

## Technical notes

- New `src/components/project/supplier/SupplierProjectFunnel.tsx` — presentational, receives the already-computed `totalEstimate / totalOrdered / totalBilled / totalReceived / outstanding / risk` values from `SupplierProjectOverview`. No new queries.
- New `src/components/project/supplier/SupplierStatStrip.tsx` — compact tile row for zero-value stages, each tile calling the existing `onNavigate(tab)`.
- `SupplierProjectOverview.tsx`: keep all existing queries and math untouched; only reorganize the render tree — snapshot, action queue, non-empty KPI cards, stat strip, collapsible analytics, PO register, lifecycle ladder.
- `SupplierProjectAnalyticsSection.tsx`: wrap the `KpiGrid` in a collapsible header using the same button pattern already used for its timeline; no metric logic changes.
- Styling stays on the existing `C` / `fontVal` / `fontMono` / `fontLabel` / `fmt` tokens from `@/components/shared/KpiCard`; `rounded-2xl` on the snapshot card per the design language.
- Mobile: funnel bars full width, stat strip wraps to two rows, action buttons stack.
