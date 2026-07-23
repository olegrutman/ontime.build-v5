# Supplier Project View — What Actually Matters

Yes, I agree. A supplier is not a GC. They don't care about "project readiness," schedule Gantts, RFIs, or GC-side margins. Their entire world on a project is one loop:

**Estimate → Purchase Order → Delivery → Invoice → Payment**

Right now the supplier's project page and sidebar are inherited from the generic project shell, so estimates sit as one of six equally-weighted KPI cards and are buried under "Scope & Contracts" in the sidebar — under Change Orders, under RFIs, under SOV. That's backwards for this role.

## What a supplier needs to see first (in priority order)

1. **This project's estimate vs. what's actually been ordered** — the gap = future revenue at risk. Everything else is downstream of this.
2. **Action needed from them right now** — POs waiting to be priced, deliveries to confirm, invoices to submit.
3. **Money owed to them** — outstanding balance, aging.
4. **Deliveries in flight** — scheduled vs. delivered.
5. **Billing + payment history** — reference, not hero.

## Proposed changes

### A. Supplier Project Overview page

Restructure `SupplierProjectOverview.tsx` into three zones:

```text
┌─────────────────────────────────────────────────────┐
│ HERO: Estimate → Ordered progress                   │
│  $142k estimate · 68% ordered · $45k still to order │
│  [ Pack-level table: est / ordered / Δ / usage% ]   │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ ACTION QUEUE (only shows if items exist)            │
│  • 3 POs need pricing        → Price now            │
│  • 2 deliveries to confirm   → Confirm              │
│  • 1 invoice ready to submit → Submit               │
└─────────────────────────────────────────────────────┘
┌───────────────┬───────────────┬─────────────────────┐
│ Deliveries    │ Outstanding   │ Billed / Received   │
│ (scheduled+   │ Balance +     │ (compact)           │
│  completed)   │ aging         │                     │
└───────────────┴───────────────┴─────────────────────┘
```

Concretely:
- Promote today's Card 1 (Estimate) + Card 2 (Ordered) into a single full-width hero card with the pack table already inline. This is the answer to "how is this project going for me."
- Add a compact `Action Queue` strip above the KPI grid, sourced from the same warnings already computed (`unpricedPOs`, `scheduledPOs`, `outstanding`). Each row is a one-click deep link.
- Demote the remaining four cards (Deliveries, Total Billed, Total Received, Outstanding) to a 3-up secondary grid. Keep the analytics section but move it below the fold.
- Header buttons: keep "Submit Invoice" as primary, add "Price Pending POs" when there are any (higher intent than "View All POs").

### B. Supplier sidebar — reorder + hide irrelevant

In `ProjectSidebar.tsx`, when `isSupplier=true`, use a supplier-specific section list instead of the generic one:

```text
Pinned:      Overview · Estimates · Purchase Orders
Sales:       Estimates · Purchase Orders · Deliveries
Money:       Invoices · Returns
Project:     Overview · Project Info · Settings
```

Hide for suppliers (already partially done via `hideForSupplier`, extending it):
- SOV, Change Orders, RFIs, Schedule, Daily Log, Backcharges, Payment Apps

Rationale: suppliers don't author COs, don't own SOV lines, don't answer RFIs. Leaving those links in the sidebar makes the tool feel like it wasn't built for them.

Change `PINNED_KEYS` to be role-aware: suppliers pin `overview / estimates / purchase-orders` instead of `overview / change-orders / invoices`.

### C. Small quality fixes while I'm in there

- Fix the pluralization bug on line 149 (`"ies"` → `"Deliveries"`).
- Make the "Submit Invoice" header button hide when there are no ordered POs (nothing to invoice against).

## Files to change

- `src/components/project/SupplierProjectOverview.tsx` — restructure into hero + action queue + secondary grid.
- `src/components/project/ProjectSidebar.tsx` — supplier-specific section list, role-aware pinned keys, extend `hideForSupplier` to CO/SOV/RFI/Schedule/Daily Log/Backcharges/Payment Apps.

## What I'm NOT doing (call out if you want it)

- No schema changes.
- Not touching the dashboard-level supplier view — this is per-project only.
- Not adding a new "Deliveries" route; it stays a section inside Purchase Orders unless you want a dedicated page.

Approve and I'll ship it.
