
# PO Analytics for the Material-Responsible Party

## Why this matters

Today the **supplier** (sell-side) has a rich analytics section (`SupplierProjectAnalyticsSection`: sell-through, A/R aging, lien clock, OTIF, returns, demand). But the **buy-side** — the GC or TC who is `isGCMaterialResponsible` / `isTCMaterialResponsible` — only sees three numbers in `MaterialsCommandCenter` (Estimate, Ordered, Delivered) and a single variance pill.

That party is the one signing POs, eating overruns, and answering to the owner. Material spend is typically **35–55% of a residential/light-commercial project**, so they need the same depth the supplier has — but framed around **budget protection, schedule risk, and cash exposure**, not sell-through.

This plan adds a `BuyerMaterialsAnalyticsSection` mounted on the project overview whenever the viewer is the material-responsible org.

---

## What gets added (6 cards + pipeline + pack table)

### 1. Budget Burn & Forecast at Completion (FAC)
- **Estimate** vs **Committed (POs ordered+)** vs **Forecast** vs **Remaining headroom**
- Forecast = Delivered + Open POs + (avg overrun % × un-ordered estimate)
- Pill: `On budget` / `Watch ±5%` / `Over`
- **Why:** Pure variance hides the trajectory. FAC tells the GC *where they'll land*, not where they are.

### 2. PO Pipeline Funnel
- Counts + $ at each stage: `Draft → Submitted → Priced → Ordered → Ready → Delivered → Finalized`
- Highlights bottlenecks (e.g. "$48K stuck in PRICED >5 days — supplier waiting on approval")
- **Why:** Material-responsible PMs lose days because POs sit unapproved. Surfacing the bottleneck = faster cycle time.

### 3. Price Variance vs Estimate
- For every PO line with a `source_estimate_item_id`, compare `unit_price` to `original_unit_price`
- Show: total $ over/under estimate, % of lines adjusted by supplier, top 5 worst offenders by SKU
- **Why:** Suppliers re-price line items between estimate and PO. The buyer needs to see *which SKUs are drifting* so they can renegotiate or re-bid.

### 4. Delivery & Schedule Risk
- Avg quoted lead time, on-time delivery rate, # POs **late** (ordered_at + lead_time_days < today, not delivered)
- Cross-reference with SOV/schedule milestones: "2 POs late blocking Framing phase"
- **Why:** A late drop of LVLs stops the framing crew. Material PMs need an early-warning list, not a post-mortem.

### 5. Returns & Waste Impact
- Total returned $, return rate %, restocking fees paid, top 3 reasons (over-ordered, damaged, wrong spec)
- Net material cost = Delivered − Returns + Restocking
- **Why:** Returns silently inflate cost. Showing waste as a % of spend turns it into a KPI worth managing.

### 6. Cash Exposure
- **Open commitments** (Ordered but not invoiced) — money they owe but haven't been billed for
- **Unpaid supplier invoices** by aging bucket (0-30 / 31-60 / 60+)
- Next 14-day expected outflow based on net terms
- **Why:** A GC can be "on budget" and still run out of cash. This is the payable-side mirror of the supplier's A/R card.

---

## Per-Pack Variance Table (expandable)

Below the cards, one row per estimate pack:

| Pack | Estimate | Ordered | Delivered | Variance $ | Variance % | Status |
|---|---|---|---|---|---|---|
| Framing Lumber | $42,100 | $44,800 | $40,200 | +$2,700 | +6.4% | Watch |
| Sheathing | $11,200 | $10,950 | $10,950 | -$250 | -2.2% | OK |

Click row → opens existing `MaterialsBudgetDrawer`.

**Why:** A single project-level variance hides which pack is bleeding. Pack-level surfaces the actual decision ("re-quote sheathing", "lock framing pricing now").

---

## Mount logic

In `GCProjectOverviewContent.tsx` and `TCProjectOverview.tsx`, render the section when:

```text
financials.isGCMaterialResponsible || financials.isTCMaterialResponsible
```

When the viewer is *not* responsible (e.g. TC on a GC-procures job), keep the current "Materials controlled by the General Contractor" line — no change.

---

## Technical details

**New files**
- `src/hooks/useBuyerMaterialsAnalytics.ts` — aggregates from `purchase_orders`, `po_line_items`, `supplier_invoices`, `returns`, `supplier_estimates`, `estimate_packs`. Returns one typed object.
- `src/components/project/BuyerMaterialsAnalyticsSection.tsx` — 6 KpiCards + funnel + pack table. Uses existing `KpiCard`, `KpiGrid`, `Pill`, `THead/TdN/TdM/TRow` shared primitives so it matches the supplier section visually.

**Reused**
- `useProjectFinancials` for material totals & responsibility flags (no new queries duplicated)
- `MaterialsBudgetDrawer` for pack drill-in
- `EVENT_META` pattern from supplier section for consistency

**Modified**
- `GCProjectOverviewContent.tsx` — mount `<BuyerMaterialsAnalyticsSection />` after `MaterialsCommandCenter`
- `TCProjectOverview.tsx` — same, gated by `isTCMaterialResponsible`

**No schema changes.** All data already exists in `purchase_orders`, `po_line_items` (with `source_estimate_item_id`, `original_unit_price`, `lead_time_days`), `supplier_invoices`, `returns`. No migration needed.

**Privacy:** Section never renders for FC or for TCs on GC-procures jobs — respects the existing `material_responsibility` rule from the privacy memory.

---

## Out of scope (could be Phase 2)

- POS/ERP exports (Hyphen/EPICOR/ECi) — separate roadmap item
- AI-driven re-order suggestions
- Cross-project material spend analytics (portfolio view)
