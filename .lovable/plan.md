

# Returns Module for Ontime.Build

## Overview

Build a complete Returns feature that functions as a reverse Purchase Order -- allowing GCs and TCs to return delivered materials to suppliers with quantity control, supplier approval, and financial integration.

## Phase 1: Database Schema

### New Tables

**`returns`** -- One record per return/pickup event

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK projects | |
| supplier_org_id | uuid FK organizations | |
| created_by_org_id | uuid FK organizations | |
| created_by_user_id | uuid FK auth.users | |
| return_number | text | Auto-generated R-0001 format via trigger |
| reason | text | CHECK: Extra, Wrong, Estimate Over, Damaged, Other |
| wrong_type | text | Required if reason=Wrong; Supplier Error or Contractor Error |
| reason_notes | text | Required if reason=Other |
| pickup_type | text | Supplier Pickup or Contractor Drop-off |
| pickup_date | date | |
| contact_name | text | |
| contact_phone | text | |
| instructions | text | |
| status | text | CHECK: DRAFT, SUBMITTED, SUPPLIER_REVIEW, APPROVED, SCHEDULED, PICKED_UP, PRICED, CLOSED |
| credit_subtotal | numeric | Sum of returnable line credit_line_totals |
| restocking_type | text | Percent, Flat, None |
| restocking_value | numeric | |
| restocking_total | numeric | |
| net_credit_total | numeric | credit_subtotal - restocking_total |
| created_at | timestamptz | |
| closed_at | timestamptz | |
| pricing_owner_org_id | uuid | Mirrors PO pricing visibility logic |

**`return_items`** -- Line items on a return

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| return_id | uuid FK returns | |
| po_line_item_id | uuid FK po_line_items | Source delivered item |
| po_id | uuid FK purchase_orders | For query convenience |
| description_snapshot | text | Frozen from PO line item |
| uom | text | |
| qty_requested | numeric | Locked on submit |
| condition | text | CHECK: New Unopened, New Opened, Good, Damaged, Wet, Cut, Painted, Mixed, Unknown |
| condition_notes | text | Required for certain conditions |
| returnable_flag | text | Pending, Yes, No |
| nonreturnable_reason | text | Required if No |
| credit_unit_price | numeric | Set by supplier |
| credit_line_total | numeric | qty_requested * credit_unit_price |

### Auto-Number Trigger

A trigger on INSERT to `returns` generates `return_number` as `R-XXXX` scoped per project.

### RLS Policies

- **SELECT**: Users in `created_by_org_id`, `supplier_org_id`, or `pricing_owner_org_id` can read returns for their projects
- **INSERT**: Users in GC or TC orgs on the project team can create returns
- **UPDATE**: 
  - Creator org can update while DRAFT
  - Supplier org can update during SUPPLIER_REVIEW (returnable flags) and APPROVED/PICKED_UP (pricing)
  - Creator org can update scheduling fields when APPROVED/SCHEDULED
- **DELETE**: Creator org can delete while DRAFT
- Pricing columns (`credit_unit_price`, `credit_line_total`, `credit_subtotal`, `restocking_*`, `net_credit_total`) follow the same visibility pattern as PO pricing via `pricing_owner_org_id`
- FC never sees pricing data

### Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.returns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.return_items;
```

## Phase 2: TypeScript Types

### New File: `src/types/return.ts`

Define `ReturnStatus`, `Return`, `ReturnItem`, `ReturnReason`, `ReturnCondition`, status labels, and color maps -- following the same pattern as `purchaseOrder.ts`.

## Phase 3: Hooks

### `src/hooks/useReturnPricingVisibility.ts`

Mirror `usePOPricingVisibility` but for returns -- determines if the current user can view pricing, edit pricing (supplier only at PICKED_UP), and view credit totals.

## Phase 4: UI Components

### New Directory: `src/components/returns/`

| Component | Purpose |
|-----------|---------|
| `ReturnsTab.tsx` | Tab content for the project page -- lists returns with status filter, "Create Return" button |
| `ReturnCard.tsx` | Card in the list view showing return number, status, item count, credit total |
| `ReturnStatusBadge.tsx` | Color-coded status badge |
| `ReturnDetail.tsx` | Full detail view with header, line items table, action buttons per status |
| `CreateReturnWizard.tsx` | Multi-step wizard: Select Items -> Reason -> Condition -> Logistics -> Review |
| `ReturnPricingPanel.tsx` | Supplier-only pricing form for returnable items + restocking fee |
| `ReturnSupplierReview.tsx` | Supplier view for marking items Yes/No returnable |
| `index.ts` | Barrel exports |

### Wizard Steps (inside CreateReturnWizard)

1. **Select Items**: Query all DELIVERED POs for this project+supplier, show `po_line_items` with qty available (quantity minus already-returned). User sets `qty_requested` per line.
2. **Reason**: Select reason, conditional fields for Wrong subtype and Other notes.
3. **Condition**: Per-line condition selector with conditional notes.
4. **Logistics**: Pickup type, date, contact, phone, instructions.
5. **Review**: Summary of all selections before submit.

### Return Detail Actions by Status

| Status | Creator Actions | Supplier Actions |
|--------|----------------|-----------------|
| DRAFT | Edit, Delete, Submit | -- |
| SUBMITTED | -- | Begin Review |
| SUPPLIER_REVIEW | -- | Mark items Yes/No, Complete Review |
| APPROVED | Schedule Pickup | -- |
| SCHEDULED | -- | Mark Picked Up |
| PICKED_UP | -- | Price Return |
| PRICED | Close Return | -- |
| CLOSED | -- | -- |

## Phase 5: Project Integration

### ProjectTopBar.tsx
Add "Returns" tab after "Purchase Orders".

### BottomNav.tsx
Add "Returns" to the project-context "More" drawer items.

### ProjectHome.tsx
- Import `ReturnsTab`
- Add `activeTab === 'returns'` rendering block
- Wire up the tab

### MetricStrip.tsx (GC/TC view)
Add a 4th metric cell for Returns showing:
- Open (non-closed count)
- Pending Review
- Total PRICED credit

### OperationalSummary.tsx
Add returns summary row showing open returns and net credit impact.

## Phase 6: Financial Integration

### FinancialSignalBar / FinancialHealthCharts
Add "Returns Credit" and "Restocking Fees" to material cost calculations:

```
Net Material Cost = PO Totals - Sum(credit_subtotal for PRICED returns) + Sum(restocking_total for PRICED returns)
```

Only PRICED and CLOSED returns affect financials. Closed does not re-calculate.

### useProjectFinancials hook
Add queries for PRICED returns to compute `returnsCreditTotal` and `restockingFeesTotal`.

## Phase 7: Credit Memo (Edge Function)

### `supabase/functions/return-credit-memo/index.ts`

Generates an HTML document containing:
- Return number, project name, supplier, material-responsible org
- Line items table with product, qty, credit unit price, line total
- Credit subtotal, restocking fee (separate line), net credit
- Date priced

Triggered from the Return Detail page via a "Download Credit Memo" button (visible after PRICED).

## Phase 8: Notifications

Use the existing `notifications` table to send alerts:
- On SUBMITTED: Notify supplier org
- On APPROVED: Notify creator org
- On PRICED: Notify pricing owner org

## Validation Rules Summary

- qty_requested cannot exceed available-to-return (delivered qty minus sum of qty_requested from non-DRAFT returns for same po_line_item)
- Reason required; wrong_type required if Wrong; reason_notes required if Other
- Condition required per line; condition_notes required for Damaged/Wet/Cut/Painted/Mixed/Unknown
- All logistics fields required before submit
- All lines must have returnable_flag set before advancing past SUPPLIER_REVIEW
- All returnable lines must have credit_unit_price and restocking defined before pricing
- Scheduling only available at APPROVED or later

## File Summary

| Action | File |
|--------|------|
| Create | `supabase/migrations/XXXXXX_create_returns.sql` |
| Create | `src/types/return.ts` |
| Create | `src/hooks/useReturnPricingVisibility.ts` |
| Create | `src/components/returns/ReturnsTab.tsx` |
| Create | `src/components/returns/ReturnCard.tsx` |
| Create | `src/components/returns/ReturnStatusBadge.tsx` |
| Create | `src/components/returns/ReturnDetail.tsx` |
| Create | `src/components/returns/CreateReturnWizard.tsx` |
| Create | `src/components/returns/ReturnPricingPanel.tsx` |
| Create | `src/components/returns/ReturnSupplierReview.tsx` |
| Create | `src/components/returns/index.ts` |
| Create | `supabase/functions/return-credit-memo/index.ts` |
| Edit | `src/pages/ProjectHome.tsx` -- add Returns tab |
| Edit | `src/components/project/ProjectTopBar.tsx` -- add Returns tab |
| Edit | `src/components/layout/BottomNav.tsx` -- add Returns to more items |
| Edit | `src/components/project/MetricStrip.tsx` -- add Returns metric cell |
| Edit | `src/hooks/useProjectFinancials.ts` -- add returns credit/restocking queries |
| Edit | `src/hooks/useProjectRealtime.ts` -- subscribe to returns tables |
| Edit | `src/components/project/FinancialSignalBar.tsx` -- show returns impact |

