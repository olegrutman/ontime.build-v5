## Goal
Clean up the Create Invoice dialog when an approved Change Order is selected. Today it shows the CO number 4 times (dropdown, badge, invoice number suffix, line), the parent contract is buried, and the CO body is a custom card that looks nothing like the SOV line-item rows. Make CO billing look and behave like an SOV line item, with the CO number demoted to a quiet reference.

## What changes (UI / behavior only, no schema changes)

### 1. Dropdown row — shorter, no double codes
Current: `[CO-FUL-IM-HA-0001] CO-FUL-IM-HA-0001 · Apr 14, 2026 → Haley Custom Homes — $1,170`
New: `CO-0001 · Bathroom remodel → Haley Custom Homes — $1,170`
- Strip the project/org prefix from the displayed CO number (show only the short tail like `CO-0001`), keep the full code internally.
- Show the CO **title** instead of repeating the code.
- Keep "(remaining …)" / "(fully billed)" suffix.

### 2. Invoice number — drop the CO tag
Current: `INV-FUL-IM-HA-COFULIMHA0001-0001` (unreadable).
New: `INV-FUL-IM-HA-0004` (same sequence as regular invoices for that contract). The CO linkage already lives in `co_ids` on the invoice row, so the CO does **not** need to be encoded in the number. Remove the `coTag` from `generateInvoiceNumber`.

### 3. Header context — show the parent contract, not just the CO
Add a small one-liner above the billing card:
`Billing under: GC → Haley Custom Homes · Contract $383,000`
So the user sees which contract this CO rolls up to (answers "what am I billing against").

### 4. Replace the custom CO card with an SOV-style line-item row
Render the CO as a single row that mirrors the SOV item row layout used in contract mode:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Bathroom remodel                              Sched     $1,170      │
│ Add tile, vanity, plumbing rough-in.          Prev      $0          │
│ Ref: CO-0001                                  This      [ 1170 ] %  │
│                                               Remaining $1,170      │
└─────────────────────────────────────────────────────────────────────┘
```

- **Title** (large): CO title.
- **Description** (muted, 2-line clamp): `selectedCO.description` (or scope summary). Need to add `description` to `BillableCO` and select it in `list_billable_change_orders` / the client query.
- **Reference line** (small, muted): `Ref: CO-0001` — this is the only place the CO number appears in the body.
- **Right column**: same Scheduled / Previously / This period / Remaining stack the SOV rows use, with the same input + `%` toggle behavior (typing a dollar value updates % and vice-versa). "Bill remaining" becomes a small link like SOV rows have, not a big button.

### 5. Remove redundant chrome
- Drop the `Badge` showing `CO CO-FUL-IM-HA-0001` at the top of the card.
- Drop the duplicated "Total / Previously billed / Remaining" right-rail block — those numbers are already in the line row.
- Keep one Gross Amount summary at the bottom (same as SOV mode).

## Files to touch
- `src/components/invoices/CreateInvoiceFromSOV.tsx`
  - Dropdown rendering (lines ~737-756): shorten label, use title.
  - `generateInvoiceNumber` (line 307): remove `coTag`.
  - CO billing block (lines ~776-840): replace `<Card>` with the same row primitive used for SOV items; add parent-contract one-liner above it.
  - `BillableCO` interface (line 70) + fetch in `setApprovedCOs` (line 232): include `description`.
- `supabase/migrations/…list_billable_change_orders…`: add `co.description` (and `co.title` if not already) to the RPC's SELECT so the client gets it. No signature change.

## Technical notes
- Storage of CO linkage stays in `invoices.co_ids` — nothing in the data model changes.
- Submission logic (line 584+) keeps writing a single line item; just reuse the new description field for the row's description and drop the `CO {co_number}` prefix from it.
- SOV row layout lives in the same file (`enabledItems.map(...)` block) — extract it into a small `<BillingLineRow>` component so the CO row can render identically.

## Out of scope
- No changes to how COs are approved, how `apply_co_contract_delta` works, or how the contract sum is computed.
- No multi-line CO billing (still one row per CO invoice).
