## Goal
Make the CO billing row behave exactly like an SOV line item: include toggle, slider, small % input, and progress bar — no separate $ input.

## Changes (UI only, `src/components/invoices/CreateInvoiceFromSOV.tsx`)

Replace the current CO row block (the $ + % grid + "This bill / Total" summary) with the same primitive used for SOV items:

1. **Header row** — CO title + remaining $ on the right (kept).
2. **Description + Ref** (kept, unchanged).
3. **Toggle (Switch)** on the left:
   - On = CO is included in this invoice; default % = 0 (or last value).
   - Off = `coBillAmount = 0`, slider/% disabled and dimmed.
4. **Progress bar** below the toggle row:
   - Shows `previousPct` filled (muted) + `thisPct` filled (accent).
   - Label left: `This bill: X.X% ($Y)`.
   - Label right: `Z.Z% total`.
   - Turns green at ≥99.95%.
5. **Slider + % input** (side by side, slider flex-1, input w-20):
   - Range `0` → `maxPct = 100 - previousPct` (clamped).
   - Two-way bound to `thisPct`; `coBillAmount = (grand_total * thisPct) / 100`.
   - Step `0.1`.
6. **"Max available: N%"** helper line under the slider (matches SOV).

Remove:
- The dollar `$` input field.
- The "Bill remaining" link (slider-to-max replaces it; user drags to end or types 100−prev).
- The destructive overbilling border (slider clamp prevents it).

Keep:
- `coBillAmount` as the single source of truth in state (derived from `thisPct`).
- All existing submit logic — `billed_percent` and amount already computed from `coBillAmount / grand_total`.
- Gross Amount footer.

## Out of scope
No DB, RPC, migration, or SOV-mode changes.
