

# Build Supplier Project Overview Page

## Overview

Create `src/components/project/SupplierProjectOverview.tsx` — a dedicated project overview for Suppliers following the same expandable KPI card architecture as the FC, TC, and GC overviews. Replace the current `SupplierMaterialsOverview` rendering in `ProjectHome.tsx`.

## Data Sources

- **POs**: Query `purchase_orders` joined with `po_line_items` scoped to project + supplier's org suppliers
- **Invoices**: Query `invoices` scoped to project + supplier POs (same pattern as `SupplierOperationalSummary`)
- **Estimates**: Query `supplier_estimates` + `supplier_estimate_items` for estimate totals by pack
- **Deliveries**: Derived from PO statuses (ORDERED → delivery scheduled, DELIVERED → complete)

## Component Structure

Uses identical helper components as FC/TC/GC overviews: `C` tokens, `KpiCard`, `Pill`, `THead`, `TRow`, `WarnItem`, `BarRow`, `fmt`, `fontVal`/`fontMono`/`fontLabel`.

### Page Header
- Left: color dot + project name + phase + supplier name
- Right: amber "Submit Invoice" → `onNavigate('invoices')`, ghost "View All POs" → `onNavigate('purchase-orders')`

### 6 KPI Cards (3-col grid)

1. **Estimate Value** (navy) — sum of estimate totals. Expand: per-pack table.
2. **Total Ordered** (amber) — sum of non-ACTIVE PO totals. Expand: est vs ordered per pack with usage % bars.
3. **Deliveries** (blue) — count of scheduled/completed deliveries from PO statuses. Expand: delivery item list with status pills.
4. **Total Billed** (blue) — sum of non-DRAFT invoices. Expand: invoice table with status.
5. **Total Received** (green) — sum of PAID invoices. Expand: invoice table with days-to-pay.
6. **Outstanding Balance** (yellow) — billed minus received + future unbilled. Expand: breakdown table.

### Below Cards — PO Register (full-width)
Table of all POs for this supplier on this project: PO#, description, delivery status, invoice status, amount.

### Warnings Section
Dynamic: upcoming deliveries, partial payments, unpriced POs.

## Files Changed

| File | Change |
|------|--------|
| `src/components/project/SupplierProjectOverview.tsx` | **New** — Full supplier project overview with 6 KPI cards, PO register, warnings |
| `src/pages/ProjectHome.tsx` | Replace `SupplierMaterialsOverview` with `SupplierProjectOverview` at line 338 |

### What is NOT changing
- `SupplierMaterialsOverview.tsx` — kept for potential reuse elsewhere
- Database schema, RLS policies
- Other role overviews (GC/TC/FC)

