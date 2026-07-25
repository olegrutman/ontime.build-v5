
## What I found

Project **5 Cherry Hills Park** (`7295c3d2…`) has two SOVs, one per contract:

- FC → TC (Pacifico → IMIS) · contract $100,000 · 18 items · values sum to $100,000 ✅
- TC → GC (IMIS → Haley) · contract $150,000 · 18 items · values sum to $150,000 ✅

Both totals reconcile to the contracts, and both percent-of-contract columns sum to exactly 100.00%.

### The authoritative numbers are actually correct
Per-item `total_billed_amount` on `project_sov_items` matches the sum of `invoice_line_items.current_billed` for every non-DRAFT invoice on this project — drift is **$0.00** on all 36 rows. Contract-level PAID invoice totals also match:

- FC→TC: $42,600 billed vs SOV rollup $42,600 ✅
- TC→GC: $40,249.20 billed vs SOV rollup $40,249.20 ✅

### What is out of sync (and why the UI looks wrong)
Two secondary columns are stale — they aren't recomputed by the current invoice triggers, so they drifted after invoice deletions / edits:

1. **`project_sov_items.billed_to_date`** (legacy scalar) is inflated vs `total_billed_amount` on most rows. Examples:
   - "Steal Installation" (both SOVs): `billed_to_date` 10,499 but real billed is 4,250 / 6,249, and value is only 4,250 / 6,255.
   - "Second Floor Walls": `billed_to_date` 12,000 with `total_billed_amount` 0 and completion 0%.
   - "Truss Sheeting": `billed_to_date` 10,500 with 0 real billing.
   - The two SOVs share identical `billed_to_date` values per matching item name — the field was being mirrored across paired SOVs, and stopped being decremented when invoices were deleted or when the newer per-item trigger took over.

2. **`invoice_line_items.total_billed`** is stale on a handful of lines (e.g., "First Sub-floor Sheeting" `sum_current` 4,250 vs `sum_total_line` 7,862.50; "Second Sub-Floor TJI's" 7,800 vs 15,912). This is the "previous_billed + current" snapshot that wasn't recomputed after earlier invoices in the chain were deleted. `current_billed` is correct; `total_billed` is not.

3. Two `INVOICE_APPROVED` notifications reference deleted invoices (`2126ef8e…`, `237c8dc1…` — INV-5 C-IM-HA-0001) — orphaned rows in `notifications`, unrelated to SOV totals but they were the visible trigger that made things look wrong.

### Root cause
The invoice trigger that maintains `project_sov_items.total_billed_amount` from `invoice_line_items.current_billed` works and is accurate. The legacy `billed_to_date` column and the per-line `invoice_line_items.total_billed` are not part of that recompute, so they carry stale values from before the current trigger was in place and from since-deleted invoices.

## Plan to fix (build mode)

1. **Recompute `project_sov_items.billed_to_date`** for this project (and, since the fix is generic, project-wide via a small backfill) so it equals the authoritative `total_billed_amount`. Stop treating it as an independent counter.
2. **Recompute `invoice_line_items.total_billed`** = `previous_billed + current_billed` for every non-DRAFT invoice on this project, so line totals stop showing ghost amounts from deleted invoices.
3. **Extend the existing SOV invoice-line trigger** to also refresh `billed_to_date` (mirror of `total_billed_amount`) on INSERT/UPDATE/DELETE, so this can't drift again.
4. **Clean up the two orphan `INVOICE_APPROVED` notifications** pointing at deleted invoice IDs on this project.
5. Verify: rerun the drift query — expect `billed_to_date = total_billed_amount` on every row and `sum(current_billed) = sum(total_billed) - sum(previous_billed)` on every line.

No UI code changes required — the display fields are already reading `total_billed_amount` / `total_completion_percent`, which are correct. The fix is a data repair plus a trigger tweak so it stays correct.
