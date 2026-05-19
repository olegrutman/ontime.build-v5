## Problem

The invoice shown (INV-FUL-IM-HA-0004) was created before the Scope-only fix landed, so its `line_notes` still contain the full CO description (Work Order title, Scope of Work, Execution Details, Compliance). New invoices already store only Scope of Work, but existing rows render the old blob.

## Fix

Apply the same `extractScopeOfWork` logic at render time so both legacy and new invoices show only the Scope of Work section.

### 1. `src/components/invoices/InvoiceDetail.tsx`
- Add a local `extractScopeOfWork(text)` helper mirroring the one in `CreateInvoiceFromSOV.tsx`:
  - Find `**Scope of Work**` (case-insensitive, optional `**`/`:`).
  - Capture until the next `**Heading**` (Execution Details, Compliance, Notes, etc.).
  - Fall back to the raw value if no Scope heading is present.
- Wrap the `{item.line_notes}` render at line 462 with `extractScopeOfWork(item.line_notes)` and only render the block when the result is non-empty.

### 2. `supabase/functions/invoice-download/index.ts`
- Add the same helper at the top of the file.
- At line 199-200, run `line_notes` through it before injecting into the PDF HTML.

### 3. `src/components/invoices/CreateInvoiceFromSOV.tsx`
- No change needed — already strips on insert and preview.

## Out of scope
- No DB migration / backfill. Render-time extraction handles legacy rows uniformly.
- No changes to the CO description itself or to PDF styling.
