## Problem

When an invoice is created from a Change Order, the resulting invoice line shows only the CO's auto-title (e.g. `CO-FUL-IM-HA-0001 · Apr 14, 2026 (CO-0001)`) and no scope description underneath. The CO's actual scope (stored in `change_orders.reason_note` as markdown with a `**Scope of Work:**` section) gets dropped in three places:

1. **SOV → CO billing path** (`CreateInvoiceFromSOV.tsx`): saves the CO's number/date as the line `description`. The scope is only saved into `line_notes`, and the on-screen description never carries a human-readable scope.
2. **Multi-CO billing path** (`CreateInvoiceFromCOs.tsx`): never writes `line_notes` at all — the scope is fully lost.
3. **PDF renderer** (`supabase/functions/invoice-download/index.ts`): the `extractScopeOfWork` helper is missing its closing `}`, which silently nests every other function inside it. The renderer also assumes `line_notes` always follows a strict `**Scope of Work:**` marker.

## Fix

### 1. `CreateInvoiceFromSOV.tsx` (CO mode at line ~611)

- Build a richer line `description`: use the CO's actual title when it isn't just the auto-generated number, falling back to `Change Order <co_number>`. Strip the `· <date>` suffix so the line reads as a real scope label, not metadata.
- Save the full CO `reason_note` (raw, untrimmed) into `line_notes`. Do NOT pre-extract — the renderer will format it.
- Keep `(CO-XXXX)` reference suffix on the description so the CO number is still visible.

### 2. `CreateInvoiceFromCOs.tsx` (multi-CO path, around line 277)

- For each generated line item, look up the parent CO and:
  - Append a short scope hint to the description when the source line came from a `co_line_items` row (use `scope.item_name`).
  - When a line corresponds to a CO with no sub-items (e.g. lump-sum), use the CO's title and store `reason_note` in `line_notes`.
- Add `line_notes` to the `invoiceLineItems` insert payload (currently missing), populated from the CO's `reason_note` for the first item per CO so the scope is preserved at least once per CO group.

### 3. `supabase/functions/invoice-download/index.ts`

- Add the missing `}` closing `extractScopeOfWork` (line 35) so the file is no longer one giant nested closure.
- Update the renderer's scope cell so that when `line_notes` is present:
  - If a `**Scope of Work:**` marker exists → render only that section.
  - Otherwise → render the full `line_notes` (trimmed), so legacy/raw rows still display.
- Convert `**bold**` markdown into `<strong>` and preserve line breaks so the scope is readable in the PDF.

### 4. `InvoiceDetail.tsx`

- Apply the same lenient extraction in the on-screen `Scope only` toggle: when no marker is found, show the full notes instead of nothing.

## Out of scope

- No DB migration; existing rows keep their stored `line_notes`. The lenient renderer fixes display for both old and new invoices.
- No change to how COs themselves store `reason_note`.

## Files touched

- `src/components/invoices/CreateInvoiceFromSOV.tsx`
- `src/components/invoices/CreateInvoiceFromCOs.tsx`
- `src/components/invoices/InvoiceDetail.tsx`
- `supabase/functions/invoice-download/index.ts`
