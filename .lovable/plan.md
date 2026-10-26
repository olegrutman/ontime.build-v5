# Partial (Progress) Billing for Work Orders

## Problem
Work orders can run up to two months, but billing is all-or-nothing today: a WO can't be invoiced until the GC acknowledges full completion, and once invoiced, the whole WO is billed at once and never appears again.

## Design
Each approved WO behaves like a Schedule of Values line: an approved value plus a running "billed to date," with invoices drawing increments.

1. **Bill as soon as approved.** Progress invoices are allowed once a WO is approved. The completion handshake (complete → GC acknowledges) only gates the final invoice, which bills the remaining balance and closes billing for that WO.
2. **Two modes by pricing type**
   - T&M / NTE: bill logged labor, materials and equipment as they happen. Each entry is marked once invoiced, so the next invoice picks up only new entries.
   - Fixed price: the subcontractor enters percent complete for the period; that share of the approved price is billed. The GC reconciles the running total at closeout (no per-claim approval).
3. **Visible balance.** The WO sidebar shows a "Billed to date" bar ($X of $Y) with Unbilled / Partially billed / Fully billed, calculated from invoices rather than stored as a status.
4. **Guardrails.** Cumulative billing can't exceed the approved price or NTE cap; rejected/withdrawn WOs stay excluded; deleting a draft progress invoice releases its entries and lowers billed-to-date.
5. **Invoice dialog.** "Create invoice from work orders" lists in-progress approved WOs with "$X billed · $Z remaining"; T&M loads only unbilled entries, fixed price asks for this period's percent.

## Technical notes
- Add nullable `invoice_line_item_id` to `co_labor_entries`, `co_material_items`, `co_equipment_items`; add `co_id` and `progress_percent` to `invoice_line_items` so billed-to-date is derived per WO.
- Shared pure helper (`src/lib/woProgressBilling.ts`) computes billed-to-date, remaining, cap and status; unit tests cover cap, percent math and final true-up.
- `CreateInvoiceFromCOs.tsx` excludes billed entries instead of whole WOs; final invoices still require `completion_acknowledged_at`.
- Invoice deletion clears entry links via `ON DELETE SET NULL`.
