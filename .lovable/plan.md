## Problem

Both invoice creators (`CreateInvoiceFromSOV.tsx` and `CreateInvoiceDialog.tsx`) default the billing period to **last month** (`startOfMonth(subMonths(now, 1))` → `endOfMonth(...)`). On July 25, 2026 that silently pre-fills **June 1–30, 2026**. Users don't notice, submit, and end up with an invoice a month behind reality.

We need the app to actively prompt the user to confirm/enter the correct dates instead of silently defaulting to a stale period.

## Fix

1. **Change the default to "unset"** — no auto-selected billing period. Both pickers open showing "Select date" (destructive-tinted) so the user must consciously pick.
2. **Offer smart quick-pick chips** above the two date buttons so common cases stay one click:
   - `This month to date` (1st → today)
   - `Last month` (previous full month)
   - `Last 2 weeks`
   - `Custom…` (just opens the calendar)
   Chip selection fills both dates and marks the period as user-confirmed.
3. **Require explicit confirmation before submit.** Track a `periodConfirmed` flag that only flips true when the user picks a chip or opens both calendars and picks a date. If it's still false when they click Submit:
   - Block submission.
   - Show an inline warning banner near the pickers: "Please confirm the billing period for this invoice."
   - Toast: "Set the billing period before submitting."
4. **Show today's date next to the pickers** ("Today: Jul 25, 2026") so the user has a reference and can quickly see when their picked period is stale.
5. **Stale-period soft warning.** If `periodEnd` is more than 15 days before today, show an amber inline hint under the End picker: "This period ended N days ago — is that correct?" (non-blocking, just a nudge).
6. Keep all existing hard validations (end ≥ start, no future dates, ≤ 2 years old).
7. On revise-and-resubmit, keep the existing behavior of restoring the prior invoice's dates and mark them as confirmed (user is editing an existing invoice).

## Files touched

- `src/components/invoices/CreateInvoiceFromSOV.tsx`
- `src/components/invoices/CreateInvoiceDialog.tsx`
- (Optional) small shared `BillingPeriodPicker` helper if the two dialogs' picker markup diverges — will inline for now to keep the change tight.

## Out of scope

- No DB / edge function changes.
- No changes to invoice numbering, SOV math, or approval flow.
