
# Supplier Materials Overview - Desktop Redesign

## Overview
Redesign the Supplier Project Overview page into a structured Materials Health Dashboard matching the provided reference image. This is a layout-only change -- no database modifications, no workflow changes.

## Architecture

Replace the current vertical stack of cards (`AttentionBanner`, `SupplierMaterialsControlCard`, `SupplierMaterialsChart`, `SupplierPOSummaryCard`, `SupplierOperationalSummary`) with a single new component: `SupplierMaterialsOverview`.

This new component consolidates all data fetching into one hook (`useSupplierMaterialsOverview`) and renders 6 structured sections.

## New Files

### 1. `src/hooks/useSupplierMaterialsOverview.ts`
Central data hook that fetches and computes all metrics in one place:

- **Estimate data**: Sum approved `supplier_estimates.total_amount` and `sales_tax_percent`
- **PO data**: All POs with `po_line_items` including `source_pack_name`, `source_estimate_item_id`, `line_total`, `unit_price`
- **Estimate items**: All `supplier_estimate_items` grouped by `pack_name` with `line_total`
- **Returns**: Sum of `returns.net_credit_total` where `status = 'CLOSED'`

Computed values:
- `estimateTotal` (budget baseline)
- `materialsOrdered` (sum of PO line totals for PRICED/ORDERED/DELIVERED)
- `deliveredTotal` (POs with status DELIVERED)
- `deliveredNet` (deliveredTotal - credits)
- `orderedVariance` (materialsOrdered - estimateTotal)
- **Pack-level forecast**: For each pack with PO items, compute `delta_pct = (actual - estimate) / estimate`, then weighted average across ordered packs. Apply to remaining unstarted packs: `forecastFinal = actualOrderedTotal + remainingEstimate * (1 + weightedAvgDeltaPct)`
- `forecastVariance` (forecastFinal - estimateTotal)
- `forecastConfidence` (low if < 3 ordered packs)
- **Packs over budget**: Pack-by-pack comparison (estimate vs ordered)
- **Materials not in estimate**: PO line items where `source_estimate_item_id IS NULL`
- **Risk factors**: Count of unpriced items (POs in SUBMITTED status), packs not started, biggest upcoming pack

### 2. `src/components/project/SupplierMaterialsOverview.tsx`
Main container component. Renders all 6 sections using data from the hook.

Layout structure:
```text
[SECTION 1: Material Status Banner - full width]
[SECTION 2: 3 KPI Cards - 3-column grid]
[SECTION 3: Budget vs Actual Chart | SECTION 4: Materials Not in Estimate - 2-column grid]
[SECTION 5: Packs Over Budget | SECTION 6: Risk Factors - 2-column grid]
```

### Section Details

**Section 1 - Material Status Banner** (full width)
- Amber/red background if over budget, green if under
- Large text: "Projected $X (Y%) Over/Under Budget"
- Subtext with forecast explanation and confidence note
- Right side: "Currently +$X (Y%) over budget" (actual, not forecast)

**Section 2 - Budget Summary** (3 equal cards)
- Card 1: Budget (Estimate) -- large dollar value
- Card 2: Materials Ordered -- with +/- variance vs estimate in red/green
- Card 3: Materials Delivered (Net) -- with delivered minus credits subline

**Section 3 - Budget vs Actual Chart** (reuses existing `SupplierMaterialsChart` logic)
- Relabeled: "Materials Budget vs Actual"
- Subtitle shows estimate total
- Same LineChart with Budget baseline, Materials Ordered, Materials Delivered lines
- Legend below

**Section 4 - Materials Not in Estimate** (table card)
- Toggle: "Ordered View" / "Delivered View"
- Table: Item description, Ordered Cost (or Delivered Cost), number of POs, First Seen date
- Data: PO line items where `source_estimate_item_id` is null, aggregated by description

**Section 5 - Packs Over Budget** (table card)
- Columns: Pack, Budget, Ordered Cost, Over Budget
- Over Budget column: "+$X (+Y%)" in red
- Data: Compare PO line items grouped by `source_pack_name` against estimate items grouped by `pack_name`

**Section 6 - Risk Factors** (simple list card)
- Warning icon bullets:
  - Unpriced items pending: X items across X POs (from SUBMITTED POs)
  - Packs not started: X of Y total
  - Biggest upcoming pack: PackName ($Amount)

## Modified Files

### `src/pages/ProjectHome.tsx` (lines 254-261)
Replace the supplier overview section:
```text
Before:
  <AttentionBanner .../>
  <SupplierMaterialsControlCard .../>
  <SupplierMaterialsChart .../>
  <SupplierPOSummaryCard .../>
  <SupplierOperationalSummary .../>

After:
  <SupplierMaterialsOverview projectId={id!} supplierOrgId={supplierOrgId} onNavigate={handleTabChange} />
```

### `src/components/project/index.ts`
Add export for `SupplierMaterialsOverview`.

## Styling
- Clean white cards with `rounded-2xl shadow-sm` (existing design system)
- Large readable numbers with `tabular-nums` font
- Uppercase tracking-wide section labels
- Soft amber/red/green backgrounds for status banners
- No dense data walls -- generous padding and spacing

## Data Flow
All queries use the existing `supplier-by-org` pattern (fetch supplier ID from org ID, then query POs/estimates). The hook consolidates what was previously 4 separate queries into a single unified fetch with memoized derived values.

## Existing Components Preserved
- `SupplierMaterialsControlCard`, `SupplierMaterialsChart`, `SupplierPOSummaryCard`, `SupplierOperationalSummary`, `SupplierEstimateVsOrdersCard` remain in the codebase (no deletion) but are no longer used on this page
- No changes to PO workflow, estimate structure, or tax calculations
