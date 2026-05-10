## Goal

Make the Change Order PDF read like a real-world AIA G701-style document: itemize all prior approved COs on the project, sum them as "previously authorized" change, then show this CO and the new contract sum.

## Scope

`supabase/functions/generate-co-pdf/index.ts` only. No DB schema changes. No frontend changes.

## Data fetch (added)

After the current CO is loaded, fetch every Approved CO on the same project:

- Query `change_orders` where `project_id = co.project_id`, `status = 'approved'`, exclude the current `co.id`. Order by `approved_at` ascending (fallback `created_at`).
- For each prior CO, also need its net amount on **the same contract perspective** the PDF is rendering. Aggregate per CO from its own labor + materials + equipment, scoped to `org_id = billingOrgId` (same scoping rule already used for the current CO at lines 180–195). Use the same GC privacy rule: if viewer is GC and the prior CO has `tc_submitted_price`, use that instead of summed labor.
- Per the user's answer, scope = "all COs on the project" — but we still filter line items / labor / materials / equipment by `billingOrgId` so the running totals stay consistent with the contract this PDF represents (otherwise summing a TC↔FC CO into a TC↔GC PDF would be nonsense). In practice every approved CO on a project has rows on each side, so this gives the correct per-contract running sum while still reflecting "all COs."

## New Contract Summary block

Replace the 3-line block at lines 260–284 with an AIA G701-style block:

```
CONTRACT SUMMARY
  Original Contract Sum ............................... $X
  Net Change by Previously Authorized Change Orders ... $Y
  Contract Sum Prior to This Change Order ............. $X+Y
  Net Change by This Change Order (CO-…-0002) ......... $Z
  New Contract Sum .................................... $X+Y+Z
```

Box height auto-grows from 80pt to fit 5 rows.

## New "Prior Change Orders" table

Inserted between the Contract Summary box and the Description of Work section. Only renders when prior approved COs exist.

Columns: `#`, `CO NUMBER`, `DATE APPROVED`, `DESCRIPTION` (truncated), `AMOUNT` (right-aligned). Same visual style as the existing Description of Work table (gray header bar, navy section title with underline). Footer row: `TOTAL PREVIOUSLY AUTHORIZED` with the sum. If the list is long, page-break handling uses the existing `y` cursor pattern (the file already does manual page math elsewhere; add a `if (y > pageHeight - 100) doc.addPage(); y = margin;` guard before each row).

## Edge cases

- No prior approved COs: skip the prior-CO table entirely; Contract Summary collapses back to the original 3 lines (Original / This CO / New Sum) so single-CO projects don't get a confusing "$0.00 previously authorized" line.
- Prior CO has zero rows on this billing side: still list it with `$0.00` so the document is faithful to the project record.
- Current CO not yet approved (Draft/Submitted): label the last row "New Contract Sum (Pending Approval)" instead of "New Contract Sum."

## Out of scope

- No changes to invoice PDF, payment app PDF, or any frontend CO surfaces.
- No DB triggers — `apply_co_contract_delta` already maintains `project_contracts.contract_sum`; we read it as-is for `originalContractSum` and recompute the running view client-side in the PDF.
