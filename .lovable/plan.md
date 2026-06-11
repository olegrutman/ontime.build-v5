# CO Detail Page — Clarity & Trust Pass

Goal: make the Change Order detail page read correctly to both a GC and a TC at a glance, with one canonical price, one status vocabulary, and role-appropriate actions.

## 1. One price, one source of truth
- Reconcile the top KPI tiles (`TC Labor $748`, `Total TC Cost $748`) with the Scope & Labor and Financials panels (`$1,035`). Investigate `useChangeOrderDetail` aggregates vs. the tile data source and align them.
- Headline number on the page = **TC Submitted / Billable to GC** (the number the GC will pay). Everything else is a breakdown.
- Tiles become: **Billable to GC** · **TC Cost** (TC-only view) · **GC Budget** (GC-only view). Remove the duplicate "TC Labor / Total TC Cost" pair when they're equal.

## 2. Unify status vocabulary
- Today the same state is called "Created" (stepper), "Draft" (pill), and "Work in Progress" (button). Pick one label set:
  - Stepper: Draft → Pricing → GC Review → Approved → Invoiced
  - Status pill matches stepper exactly
  - Action button describes the *next move*, not the current state
- Apply across `CODetailLayout`, `useChangeOrders` (`BOARD_COLUMNS`, `STATUS_TO_COLUMN`), and the CO type labels.

## 3. Role-aware actions panel
- Resolve viewer role (GC / TC / FC) once at the top of `CODetailLayout` using `useCORoleContext`.
- Swap button labels and visibility by role:
  - GC sees: "Send back for revision", "Approve", "Reject"
  - TC sees: "Submit pricing to GC", "Save draft", "Cancel CO"
  - FC sees: read-only with task list
- Rename **Withdraw permanently** → **Cancel this change order** + confirm dialog.

## 4. Scope & Labor card — stop the duplicate render
- Show the AI narrative **or** the bullet list, not both. Default to narrative, with an expandable "View scope items" toggle for the bullets.
- Show the **line-item price inline** next to the "Priced" pill.
- Replace the bare **EA** chip with plain English ("each") or remove.
- Add a small **Responsibility badge** at the top of the card: "Materials: GC procures" / "Equipment: TC procures", driven by `useCOResponsibility`.

## 5. Financials sidebar — show the breakdown
- Replace single-line "TC Submitted $1,035" with a mini breakdown:
  - Labor · Materials · Equipment · Markup → **Total**
- TC sees full breakdown. GC sees a breakdown only when markup disclosure mode allows it (`useMarkupVisibility`); otherwise GC sees Labor + Materials + Equipment + "TC fee" + Total.

## 6. "Pricing details hidden" empty state
- Only render this for GC viewers on fixed-price COs where disclosure is hidden.
- For TC viewers, render the actual cost editor in that slot instead — today they see an empty-state meant for the GC, which reads like a broken page.

## 7. Small polish
- Tooltip on "GC Budget" tile explaining what it's for ("Your internal cap for this CO").
- "Final" chip on Total TC Cost tile — clarify what "Final" means or remove if it's just a status echo.
- Materials/Equipment section headers should always render (even empty) so the page structure is predictable.

---

## Technical notes
- Files in scope:
  - `src/components/change-orders/CODetailLayout.tsx` and its KPI/Actions/Financials children
  - `src/hooks/useChangeOrderDetail.ts` (reconcile total formula)
  - `src/hooks/useChangeOrders.ts` (`STATUS_TO_COLUMN`, `BOARD_COLUMNS` labels)
  - `src/hooks/useCORoleContext.ts` (single source for viewer role gating)
  - `src/hooks/useMarkupVisibility.ts` (drive GC breakdown granularity)
  - `src/hooks/useCOResponsibility.ts` (drive responsibility badge)
  - `src/types/changeOrder.ts` for any status label maps
- No DB migration required. All changes are presentation + role-gating; financial formulas in `useChangeOrderDetail` get audited but the canonical `tc_submitted_price` / `co_labor_entries` math stays intact.
- Respect existing privacy memories: GC never sees TC margin; TC never sees supplier pricing when GC procures.

## Out of scope
- Wizard changes (scope/routing stays as-is)
- Invoicing flow
- New status states or new DB columns
