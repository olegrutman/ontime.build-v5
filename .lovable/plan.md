## Goal
Let any user with access to an invoice edit the line item **description** and **scope notes** while the invoice is in `DRAFT`, `SUBMITTED`, or `REJECTED` status. Lock editing once the invoice reaches `APPROVED` or `PAID`.

## Scope
- Edit only: `invoice_line_items.description` and `invoice_line_items.line_notes`.
- No changes to amounts, totals, billing periods, or status flow.
- No changes to PDF generation — it already reads `description` + `line_notes`, so edits flow through automatically.

## UI changes (`src/components/invoices/InvoiceDetail.tsx`)
1. Add a small **pencil icon** in each line item's Description cell, visible only when `status !== 'APPROVED' && status !== 'PAID'`.
2. Clicking opens an inline editor inside the same cell with:
   - Single-line `Input` for `description`
   - Multi-line `Textarea` for `line_notes` (full raw text, including any `**Scope of Work:**` markdown)
   - `Save` / `Cancel` buttons
3. On save: update the row via Supabase, refresh local `lineItems` state, toast success. On cancel: revert.
4. Keep the existing `Scope only` / `Full notes` toggle for read mode.

## Data layer
- Direct `supabase.from('invoice_line_items').update({ description, line_notes }).eq('id', item.id)`.
- Existing RLS on `invoice_line_items` already gates by project participation, so any project participant can edit — matches your "anyone with access until Approved" choice.
- Add a lightweight client-side guard that re-checks `invoice.status` right before the update and refuses if it's `APPROVED` / `PAID` (defense in depth; the real lock is the conditional UI).

## Validation
- `description`: trimmed, required, max 500 chars (zod).
- `line_notes`: optional, max 5000 chars.
- Show inline error messages; disable Save while invalid.

## Activity log (optional, low-risk)
- After a successful edit, append an activity row `invoice.line_edited` with the invoice id and item id so there's an audit trail. Skip if it adds noise — happy to drop this if you prefer.

## Out of scope
- No editing of scheduled_value / current_billed / retainage.
- No edit history UI beyond the activity row.
- No changes to CO-generation paths (`CreateInvoiceFromSOV`, `CreateInvoiceFromCOs`); those already populate `line_notes` correctly from the previous fix.

## Files touched
- `src/components/invoices/InvoiceDetail.tsx` — add edit state, inline editor, save handler.

That's the entire change.