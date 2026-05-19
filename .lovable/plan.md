## Strip CO description to scope-only on invoice line

The CO description contains multiple markdown sections (Work Order title, Scope of Work, Execution Details, Compliance). Currently the entire blob is snapshotted into `invoice_line_items.line_notes`. We will extract only the Scope of Work section before saving and rendering.

### Changes

**1. `src/components/invoices/CreateInvoiceFromSOV.tsx`**
- Add a small helper `extractScopeOfWork(desc: string | null): string | null` that:
  - Returns `null` if input is empty.
  - Finds a `**Scope of Work` heading (case-insensitive, tolerant of `:`/`:**` variations).
  - Captures text from the end of that heading until the next `**…**` heading (e.g. `**Execution Details`, `**Compliance`, `**Notes`) or end of string.
  - Trims whitespace; returns `null` if the result is empty.
  - If no Scope heading is found, falls back to returning the original description (so older COs without that structure still show something).
- Line 601: replace `line_notes: selectedCO.description || null` with `line_notes: extractScopeOfWork(selectedCO.description)`.
- Line 837–839 preview block: render the extracted scope instead of the raw description so the UI matches what gets saved.

**2. No DB / PDF changes**
- `invoice-download/index.ts` already renders whatever is in `line_notes` — no edit needed.
- No migration; existing invoices keep their stored notes. (Optional backfill is out of scope unless requested.)

### Out of scope
- Editing already-created invoices' `line_notes`.
- Changing the CO description itself.
- Adding execution details as a separate collapsible section.