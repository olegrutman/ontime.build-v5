# Per-Project Supplier Analytics — Expansion Plan

## Why (real-world lumber/material yard lens)

Today, `SupplierProjectOverview` shows 6 cards: Estimate, Ordered, Deliveries, Billed, Received, Outstanding — plus pack-by-pack ordered vs estimate. That's a solid finance/throughput view, but a real yard manager, A/R clerk, and outside sales rep also need to answer:

1. **"How is THIS job actually consuming material — and what's left to sell into it?"** (sell-through, remaining wallet share, re-order velocity)
2. **"Am I going to get paid on time on this job?"** (project-level aging, days-to-pay trend, lien/notice clock)
3. **"What's the operational risk on the next truck?"** (backorders, partial fills, returns/credits eating margin)
4. **"Is this customer profitable on this job?"** (GM% per pack, returns ratio, price overrides)
5. **"Where will the next PO come from?"** (un-ordered packs, COs/WOs that imply more material)

None of those are answered today on the per-project supplier view. This plan adds them as **new cards/sections** alongside the existing 6 — nothing is removed.

---

## What to add (in priority order)

### 1. Sell-Through & Remaining Wallet (Card 7)
Right of "Total Ordered". Shows:
- **Remaining estimate $** = `estimate − ordered` (already computed, surface it as a primary number)
- **Wallet capture %** = ordered ÷ estimate
- **Re-order velocity**: POs/week over last 4 weeks (sparkline)
- **Days since last PO** (stale-job indicator)
- **Packs not yet ordered** count → click to filter PO list

*Why:* Outside sales' #1 question is "what's left on this job and is it slipping away to a competitor?" Stale-PO + un-ordered-packs flags surface that.

### 2. Project A/R Aging Snapshot (Card 8)
Project-scoped version of the dashboard receivables. Shows:
- **Current / 1–30 / 31–60 / 61–90 / 90+** buckets, $ amounts, with the GC name
- **Average DSO on this project** (paid invoices: avg days submitted→paid)
- **Days past due on oldest open invoice**
- **Lien/preliminary-notice deadline** flag (state-configurable, default 90 days from first delivery)

*Why:* Every yard A/R clerk works job-by-job, not org-by-org, when chasing payment. The "lien clock" is the single most important date a materialman tracks.

### 3. Delivery Performance & Operations (Card 9)
Replaces today's flat delivery list with metrics:
- **On-time delivery %** (delivered_at vs requested date)
- **Avg lead time** (PO created → delivered) per pack
- **Open backorders** $ and line count (POs in `ORDERED` past their requested date)
- **Partial deliveries** (POs where shipped qty < ordered qty) — requires `po_shipments` from earlier roadmap; until then, show "—"
- **Next 7-day delivery calendar strip**

*Why:* Dispatch and yard ops measure themselves on OTIF (on-time-in-full). Backorders are the #1 source of GC complaints.

### 4. Returns & Credits Impact (Card 10)
- **Total returns $** issued on this project
- **Return rate** = returns ÷ delivered (red if >3%)
- **Credit memos outstanding** (issued but not applied)
- **Top return reasons** (top 3 with $ totals) — pulled from existing returns table

*Why:* Returns silently destroy margin and are invisible today on the project view. A 5% return rate on a $200k job is $10k gone.

### 5. Project Margin & Pricing Health (Card 11)
- **Estimated GM%** vs **Realized GM%** (requires cost on `catalog_items` or PO line `unit_cost`; if absent, show "Cost data needed" CTA)
- **Price-override count** (PO lines where `price_adjusted_by_supplier = true`) and total $ given away
- **Discount $ vs list** (if list price tracked)
- Per-pack GM% mini-bar

*Why:* The owner's job-by-job profitability question. Override tracking catches sales reps over-discounting.

### 6. Future Demand Signal (Card 12)
- **Active COs/WOs** on this project (count + $) — pulled from `change_orders` joined to project
- **Estimates submitted but not yet approved** (already partly shown — promote to a leading indicator)
- **GC's project schedule milestones** (if `project_schedule` data available) — show "Framing starts 2025-06-15 → likely lumber draw"

*Why:* Lets the inside sales desk pre-stage material and offer JIT delivery. This is the "why didn't you tell me they needed trusses Friday" prevention card.

### 7. Project Activity Timeline (Side panel, collapsible)
Single chronological feed of: PO created → priced → delivered → invoiced → paid → returns → COs. Filterable by event type. Today the supplier has to bounce between tabs to reconstruct what happened.

---

## Layout

Existing 6 cards stay in place (rows 1–2). Add:

```text
Row 3:  [ Sell-Through (7) ]   [ A/R Aging (8) ]
Row 4:  [ Delivery Perf (9) ]  [ Returns (10) ]
Row 5:  [ Margin & Pricing (11) ] [ Future Demand (12) ]
Row 6:  [ Project Activity Timeline — full width, collapsible ]
```

Same `KpiCard` / `KpiGrid` primitives already used → zero design drift.

---

## Technical details

**No schema changes required for cards 1, 2, 3 (partial), 4, 6, 7.** All data exists in `purchase_orders`, `invoices`, `returns`, `change_orders`, `supplier_estimates`, `project_schedule`.

**Schema additions needed for full fidelity (defer to follow-up if not approved now):**
- `purchase_orders.requested_delivery_date` (date) — needed for OTIF % in card 9
- `po_line_items.unit_cost` (numeric) — needed for realized GM% in card 11. Falls back to `catalog_items.unit_cost` if present.
- `customer_lien_settings(supplier_id, state, notice_days, lien_days)` — for card 2's lien clock. Until then, hardcode 90-day default.
- Backorder/partial detection assumes the `po_shipments` table from the earlier supplier roadmap (Phase 2). Until then, card 9 shows "Setup required" for backorder/partial metrics.

**New hook**: `useSupplierProjectAnalytics(projectId, supplierId)` aggregating all six new computations in a single React Query call (server-side via a Postgres view `v_supplier_project_analytics` to keep client lean).

**New components** (under `src/components/project/supplier-analytics/`):
- `SupplierSellThroughCard.tsx`
- `SupplierProjectAgingCard.tsx`
- `SupplierDeliveryPerfCard.tsx`
- `SupplierReturnsImpactCard.tsx`
- `SupplierProjectMarginCard.tsx`
- `SupplierFutureDemandCard.tsx`
- `SupplierProjectTimeline.tsx`

Mounted from `SupplierProjectOverview.tsx` after the existing `KpiGrid`.

**Notifications** (additive, reuse existing system): `PROJECT_STALE_NO_PO` (no PO in 21 days on active project), `PROJECT_LIEN_CLOCK_30_DAYS`, `PROJECT_BACKORDER_OVERDUE`. All three add to the per-project supplier "needs attention" surface.

**Privacy**: All computations stay within the supplier's own POs/invoices/returns. No new cross-org data exposure. RLS unchanged.

---

## Phasing recommendation

- **Phase A (no schema)**: Cards 1, 2, 4, 6, 7 + timeline. Ship-able immediately against current data.
- **Phase B (light schema)**: Add `requested_delivery_date` + `unit_cost`, then enable cards 3 and 5 fully.
- **Phase C (depends on supplier roadmap Phase 2)**: Backorder/partial-fill metrics in card 3 once `po_shipments` lands.

Reply with which phase to build first (A is the obvious start).
