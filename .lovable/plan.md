## Goal
Let the user bill a CO by percent OR dollars, with the two synced — same UX as SOV line items.

## Changes (UI only, single file)

`src/components/invoices/CreateInvoiceFromSOV.tsx`, inside the CO billing row's "This period" block:

1. **Add a % input next to the $ input** (side-by-side, $ on the left, % on the right).
2. **Two-way sync** against `selectedCO.grand_total`:
   - `$` change → `coBillAmount = $`; derived `%` = `$ / grand_total × 100`.
   - `%` change → `coBillAmount = grand_total × % / 100`.
   - Keep a single source of truth (`coBillAmount` in state). Render `%` as a derived value bound to a controlled input; on change, recompute `coBillAmount`.
3. **Cumulative line under the inputs** (mirrors SOV rows):
   - `Previous: X% ($prev) · This bill: Y% ($this) · Total: Z%`
   - `previousPct = already_billed / grand_total × 100`.
4. **Caps & validation**:
   - Max `%` = `100 − previousPct` (≈ `remaining / grand_total × 100`).
   - Reuse existing `coOverbilling` logic; turn the % input border destructive too when over.
5. **"Bill remaining" link** unchanged — sets `$ = remaining`; `%` follows automatically.
6. **Persistence**: no change needed. `billed_percent` is already computed from `coBillAmount / grand_total` in the submit branch (line ~585) and stored on the invoice line item.

## Out of scope
- No DB / RPC / migration changes.
- No multi-line CO billing.
- No change to SOV-mode rendering.
