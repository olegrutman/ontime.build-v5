

# Returns Wizard Upgrades (PO Wizard Parity)

## Current State
The Returns feature already exists with a 5-step wizard, supplier review, supplier pricing, status flow, and full CRUD. This plan upgrades it to match the PO Wizard's polish and adds missing capabilities.

## Database Changes

### Migration: Add columns to `return_items`
- `reason` TEXT DEFAULT NULL -- per-item reason (Extra, Wrong, Damaged, Other)
- `reason_notes` TEXT DEFAULT NULL -- per-item reason explanation
- `accepted_qty` NUMERIC DEFAULT NULL -- supplier-adjusted qty (cannot exceed qty_requested)
- `original_unit_price` NUMERIC DEFAULT 0 -- snapshot from PO line item at creation time

### Migration: Add `REJECTED` to return status
- Update the status check constraint (if any) to include `REJECTED`
- No new table needed; just allow the value

### Migration: Update RLS
- No RLS changes needed; existing policies cover the new columns

## File Changes

### 1. `src/types/return.ts`
- Add `REJECTED` to `ReturnStatus` type and status labels/colors
- Add `reason`, `reason_notes`, `accepted_qty`, `original_unit_price` to `ReturnItem` interface

### 2. `src/components/returns/CreateReturnWizard.tsx` -- Major refactor

**Step 1 (Select Items):**
- Add unit price column to the item table (from `po_line_items.unit_price`)
- Add "Line Total" column showing `available * unit_price` for context
- Store `original_unit_price` per selected item from PO data

**Step 2 (Reason) -- Merge into Details step:**
- Combine the current Step 1 (Reason) and Step 2 (Condition) into a single "Return Details" step
- For each selected item, show:
  - Return qty input (already exists)
  - Reason dropdown per item (Extra / Wrong / Damaged / Other) -- NEW
  - Condition dropdown per item (already exists)
  - Notes (already exists)
  - Read-only unit price + line credit preview (qty * unit_price)
- Remove global reason step (Steps 1+2 become one step)

**Step 3 (Logistics) -- Now Step 2:**
- No changes, same as current Step 3

**Step 4 (Review/Summary) -- Now Step 3:**
- Add PO-wizard-style totals panel:
  - Credit Subtotal: sum of (qty_requested * unit_price) for all items
  - Restocking Fee: "Pending supplier review"
  - Tax Adjustment: "Pending"
  - Estimated Credit Total: same as subtotal with "(pending supplier approval)" label
- Add warning banner: "Final credit amount will be confirmed by supplier after review."
- Show items table with unit price and line credit columns

**Wizard steps reduced from 5 to 4:**
1. Select Items (with pricing)
2. Return Details (per-item reason + condition + credit preview)
3. Logistics
4. Review & Submit (with totals panel)

**On submit:**
- Save `original_unit_price` per return_item from PO line item price
- Save `reason` per return_item
- Set `credit_unit_price = original_unit_price` and `credit_line_total = qty * original_unit_price` as initial values

### 3. `src/components/returns/ReturnSupplierReview.tsx` -- Enhance

Add capabilities:
- **Adjust accepted qty** per item (input field, max = qty_requested, min = 0)
- **Set unit credit** per item (default = original_unit_price, editable)
- **Line credit preview** = accepted_qty * unit_credit
- **Restocking fee** controls (type + value) -- move from pricing panel to here
- **Running totals** at bottom: Credit Subtotal, Restocking Fee, Net Credit
- **Reject Return** button (sets status to REJECTED)
- **Approve Return** button (saves all adjustments, sets status to APPROVED)

On approve:
- Update each `return_item` with `accepted_qty`, `credit_unit_price`, `credit_line_total`
- Compute and save `credit_subtotal`, `restocking_type/value/total`, `net_credit_total` on the return header
- Set status to APPROVED

### 4. `src/components/returns/ReturnPricingPanel.tsx` -- Simplify

Since pricing is now handled during Supplier Review:
- This panel is now only shown at PICKED_UP status for final price adjustments
- Keep existing functionality but pre-populate with values set during review
- Supplier can make final adjustments before marking as PRICED

### 5. `src/components/returns/ReturnDetail.tsx` -- Minor updates

- Show `original_unit_price` and `credit_unit_price` columns when pricing is visible
- Show `accepted_qty` vs `qty_requested` when they differ
- Show per-item reason in the items table
- Add handler for REJECTED status display
- Show financial summary for APPROVED status (not just PRICED)

### 6. `src/components/returns/ReturnCard.tsx` -- Minor update

- Show estimated credit on SUBMITTED/APPROVED cards (not just PRICED)

### 7. `src/components/returns/ReturnStatusBadge.tsx` -- Add REJECTED

- Add REJECTED status color/label (already in types update)

## Technical Details

### Wizard step mapping (old to new)
```text
OLD (5 steps):                    NEW (4 steps):
0. Select Items                   0. Select Items (+ unit price)
1. Reason (global)                1. Return Details (per-item reason + condition + credit preview)
2. Condition (per-item)           2. Logistics
3. Logistics                      3. Review & Submit (+ totals panel)
4. Review
```

### Data flow for pricing
```text
PO Line Item (unit_price) --> Return Item (original_unit_price)
                          --> Return Item (credit_unit_price = original initially)
                          --> Supplier adjusts during review
                          --> Supplier finalizes during pricing (PICKED_UP)
```

### Files created: None
### Files modified: 6 files
| File | Change |
|------|--------|
| `src/types/return.ts` | Add REJECTED status, new ReturnItem fields |
| `src/components/returns/CreateReturnWizard.tsx` | 4-step wizard with pricing, per-item reason, totals panel |
| `src/components/returns/ReturnSupplierReview.tsx` | Accepted qty, unit credit, restocking, reject option |
| `src/components/returns/ReturnPricingPanel.tsx` | Pre-populate from review, final adjustments only |
| `src/components/returns/ReturnDetail.tsx` | Show new fields, REJECTED status |
| `src/components/returns/ReturnCard.tsx` | Show estimated credit earlier |

### Database: 1 migration
- Add `reason`, `reason_notes`, `accepted_qty`, `original_unit_price` columns to `return_items`

