
## Problem

At 390px on `/project/:id/invoices`, each `InvoiceCard`:
- Uses a 2-column inner grid for Billing Period + Amount that gets cramped and the period truncates.
- Stacks a status pill, age badge and invoice number on one line, causing wraps.
- Renders full-height action buttons (44px) that push the card past what fits above the fixed bottom nav.

Result: users scroll a lot and can't scan invoices at a glance. Table view isn't an option below 640px.

## Plan

Give mobile its own dedicated layout instead of shrinking the desktop card.

### 1. New `InvoiceRow` (mobile-only, ≤640px)
Full-width tap row, 1 per line, ~72px tall:

```text
┌─ ┬───────────────────────────────────────────────┐
│▌ │ INV-0007            $12,400  ●SUBMITTED  12d  │
│▌ │ Nov 1 – Nov 15 · Kitchen remodel               │
└─ ┴───────────────────────────────────────────────┘
```

- 3px status accent stripe (kept from card).
- Line 1: invoice # (mono) · amount (mono, right-aligned, bold) · status dot+label · age badge.
- Line 2: billing period · contract/PO short label, truncated with ellipsis.
- Tap = open detail. Long-press or trailing kebab (`⋯`) opens the same action set (Edit / Submit / Approve / Delete) in a bottom sheet — no inline 44px buttons taking vertical space.
- Sticky "Needs action" chip at the top of the row when `DRAFT` (submitter) or `SUBMITTED` (approver) so the primary action is one tap away without eating card height.

### 2. Swap layout by breakpoint in `InvoicesTab.renderInvoiceList`
- `<640px`: render `InvoiceRow` list, `divide-y` inside a single bordered container.
- `≥640px`: keep existing `InvoiceCard` grid / `InvoiceTableView` behaviour untouched.

### 3. Tighten the tab header on mobile
Above the list, the filter row currently stacks: sub-tab pills (GC) + direction toggle (TC) + status `Select` + `ViewSwitcher`. On mobile:
- Hide `ViewSwitcher` (table isn't available anyway).
- Put status filter and NEEDS_ACTION toggle into a single compact `Select` (`All · Needs action · Draft · Submitted · …`).
- Keep sub-tab / direction as a full-width segmented control.

### 4. InvoiceDetail mobile pass (same page)
- Header actions (Back, Download, Approve/Reject/Submit) collapse into a sticky bottom action bar so the scrollable body uses the full viewport minus 52px top and 57px bottom nav.
- Line-item table becomes a stacked card list below 640px (description → scheduled / previous / current / retainage as a 2-col micro grid).

### 5. Verification
Playwright at 390×844 and 390×609:
- Screenshot list with 0, 1, 5 invoices — confirm no content hidden behind bottom nav and each row ≤80px.
- Open one invoice, confirm sticky action bar and no horizontal scroll.

## Files touched
- New: `src/components/invoices/InvoiceRow.tsx`, `src/components/invoices/InvoiceActionSheet.tsx`
- Edit: `src/components/invoices/InvoicesTab.tsx` (breakpoint switch + mobile filter header)
- Edit: `src/components/invoices/InvoiceDetail.tsx` (sticky mobile action bar + stacked line items)

No data, RLS, or query changes — presentation only.
