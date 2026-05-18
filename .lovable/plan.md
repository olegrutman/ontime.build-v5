## Goal
Show the Change Order's description (scope/work narrative) on the invoice line — both in the app and the exported PDF.

## Approach
Store the CO description on the invoice line item itself (snapshot at creation, so historical invoices stay stable), then render it below the line description.

## Changes

### 1. DB migration — `invoice_line_items.line_notes`
Add a nullable `text` column:
```sql
ALTER TABLE public.invoice_line_items ADD COLUMN line_notes text;
```
No backfill needed (existing rows show no subtitle).

### 2. CO invoice creation — `src/components/invoices/CreateInvoiceFromSOV.tsx`
In the CO branch (~line 597), populate `line_notes: selectedCO.description || null` on the inserted line item. SOV branch stays `null`.

### 3. App invoice view — `src/components/invoices/InvoiceDetail.tsx`
In the line items table cell (line 458), render `item.line_notes` (when present) as a 2-line-clamped muted paragraph under `item.description`.

### 4. PDF — `supabase/functions/invoice-download/index.ts`
In `itemRows` (~line 199), when `item.line_notes` is present append a small muted `<div class="line-notes">…</div>` under the description cell, and add a `.line-notes { font-size: 10px; color: #6b7280; margin-top: 2px; }` style to the existing `<style>` block.

## Out of scope
- No changes to SOV line item rendering.
- No retroactive update of existing invoices (no backfill).
- No UI to edit `line_notes` after invoice creation (description is snapshot-only).
