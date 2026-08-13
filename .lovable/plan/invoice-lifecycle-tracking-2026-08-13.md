# Invoice Lifecycle Tracking

Yes — you want to see, for every invoice, when it was submitted, when it was approved, and when it was paid, with a visible trail instead of just a status badge.

## What exists today

The invoices table already stores `submitted_at` / `submitted_by`, `approved_at` / `approved_by`, `rejected_at` / `rejected_by`, `paid_at`, and `voided_at` / `voided_by`, and the app writes all of them on each action. Live data confirms they are populated (e.g. INV-MAI-TC-TE-0001: submitted 17:36, approved 17:37, paid 17:37 on Aug 9).

Two real gaps:
- **Nothing shows these dates.** The detail page and all three list views (row, card, table) only display created date and billing period. The dates exist but are invisible.
- **Payment has no actor or reference.** There is no `paid_by`, no payment date the user can set (it always stamps "now"), no method or check/ACH reference.

## What to build

1. **Payment Timeline card on the invoice detail page**
   A vertical 4-step trail: Created → Submitted → Approved → Paid, plus Rejected / Voided branches when they apply. Each step shows the date and time, who did it (resolved name from profiles), and days elapsed since the previous step. Future steps render greyed as "Pending". Rejection reason and void reason display inline on their steps.

2. **Dates in the lists**
   - Table view: add Submitted / Approved / Paid columns (sortable), keeping the existing age column.
   - Mobile row and card: show the most recent milestone as one compact line, e.g. "Approved Aug 9 · awaiting payment 4d" or "Paid Aug 9".

3. **Record payment properly**
   Replace the one-click "Mark as Paid" with a small Record Payment dialog: payment date (defaults to today, backdating allowed), optional method (Check / ACH / Wire / Card / Other), optional reference number, optional note. Saving stamps `paid_at` from the chosen date and records who marked it paid.

4. **Days-to-pay signal**
   On the detail page header, show "Paid in N days" once paid, or "Outstanding N days" while approved and unpaid, using submitted→paid as the interval (same definition already used in supplier analytics).

## Technical notes

- Migration on `public.invoices`: add `paid_by uuid`, `payment_method text`, `payment_reference text`, `payment_note text`. No new table — the existing columns plus these are enough for a full audit trail, and RLS/grants on `invoices` already cover them.
- Extend the `Invoice` type in `src/types/invoice.ts` with the new fields.
- New component `src/components/invoices/InvoiceTimeline.tsx`, rendered in `InvoiceDetail.tsx` above the line items; a compact variant is reused by `InvoiceRow.tsx` / `InvoiceCard.tsx`.
- New `RecordPaymentDialog.tsx`; the paid transition in `InvoiceDetail.tsx` moves behind it and writes `paid_at`, `paid_by`, and the payment fields in one update.
- Actor names resolve via a single `profiles` lookup on the ids present on the invoice (submitted_by, approved_by, rejected_by, paid_by, voided_by).
- No changes to financial rollups: voided invoices stay excluded, and `paid_at` keeps driving cash-flow cards exactly as it does now.
