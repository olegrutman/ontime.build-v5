I walked the GC → TC → FC path through the CO/WO code and live data and found 12 problems. They're grouped by where they bite, with severity, root cause, and the fix.

## How I tested

Walked these journeys against `useChangeOrderDetail`, `useCORoleContext`, `COStatusActions`, `CONextActionBanner`, `COAcceptBanner`, `FCPricingToggleCard`, `COMaterialsPanel`, `CODetailLayout`, plus the live `change_orders` and `co_labor_entries` rows.

- GC: create CO → assign TC → share / send-to-WIP → review submission → approve/reject → mark contracted
- TC: receive CO → request FC hours → log internal labor → close-for-pricing → submit upstream → see GC decision
- FC: get invited → accept → log hours/internal cost → submit pricing back to TC

## Critical (data integrity / wrong money)

### 1. Approval double-counts the CO into the contract sum
`COStatusActions.doApprove()` (lines 261-283) finds the GC↔TC `project_contracts` row and writes `contract_sum = current + grandTotal` after every approval. Two ways this corrupts:
- If the same CO is approved twice (re-approve flow, restart of mutation, race) the sum is added twice.
- If the user later edits the CO and re-approves a revised number, the sum is added on top of the previous addition.
- It uses `.or(...)` to match either direction; on projects with multiple TCs sharing the GC the first row wins.

**Fix:** stop mutating `project_contracts.contract_sum` from the client. Either (a) compute the active contract value as `base + sum(approved CO grandTotal)` in a view/SQL function, or (b) move the increment into a Postgres trigger that runs once on the `approved_at IS NULL → NOT NULL` transition and reverses on rejection/un-approval. Why: contract sum must be derived, not accumulated by a UI button.

### 2. FC `submit_to_tc` calls `complete_fc_change_order_input` even when FC is the CO creator
In `CODetailLayout.handleAction` the `submit_to_tc` case always calls `completeFCInput` — a collaborator-completion RPC. When an FC owns the CO (`created_by_role='FC'`), the correct action is the FC's own submit, which then triggers `forward_change_order_to_upstream_gc` from the TC side. There are 0 FC-created COs in the DB right now so it hasn't bitten, but the moment an FC starts a CO this button will silently no-op or error.

**Fix:** branch on `co.created_by_role === 'FC' && co.org_id === myOrgId` → call `submitCO`; on FC-as-collaborator → call `completeFCInput`. Why: the wizard already supports FC-created COs, so the submit pipeline must too.

### 3. Internal cost edit only appears when its date matches a billable date
`COLineItemRow` resolves the internal row via `actualCosts.find(a => a.entry_date === entry.entry_date)`. We just patched the orphan list, but the same heuristic still drives the inline pencil. If a TC logs `Apr 15` billable and `Apr 16` internal, the internal row floats into the "Internal-only" section instead of pairing with the billable. Margin math is unaffected, but the edit affordance and the per-row "Int. Cost" column are misleading.

**Fix:** stop matching by `entry_date`. Add a nullable `paired_billable_entry_id` on `co_labor_entries` and let the form set it when the user is editing/adding from a specific row. Pair by ID, not by date. Why: dates are user input, not a stable join key.

### 4. `tc_submitted_price` is mutated during draft, then used as a price freeze elsewhere
`FCPricingToggleCard` writes `tc_submitted_price` whenever the toggle is on and FC numbers change. We already removed it from the TC edit-freeze in `useCORoleContext`, but it is also used by `useChangeOrderDetail.tcBillableToGC` to compute `grandTotal`. If the toggle is left ON and the TC then turns it OFF, `tc_submitted_price` is cleared — fine — but if the TC submits with toggle ON, the snapshot the GC sees is whatever the live formula produced, not what the TC reviewed.

**Fix:** rename the column to `tc_price_snapshot`, only write it from the explicit "Submit" action (already done in `doSubmit`), and have the toggle card show a **preview** without persisting. Why: a "submitted price" should change exactly once — at submission.

## High (workflow blockers users will hit)

### 5. There is no UI to delete a CO line item
`useChangeOrderDetail` exports `deleteLineItem`, but no component imports it. Once a row is added (especially by the wizard), the only way to remove it is direct DB. This will cause noisy COs and skew the priced/total counters.

**Fix:** add a trash button in `COLineItemRow`'s edit popover, gated by `canEditExternal && isMyOrgItem` and confirmation if the row has labor/material entries. Why: parity with materials/equipment which already have delete.

### 6. Recall is offered, but recalling a CO does not roll back the approval-time contract bump
Combined with #1: if a GC approves, then the TC recalls (or the GC rejects after approving), the contract sum stays inflated. Right now `canRecall` is only available pre-approval, but `rejectCO` post-approval is implicitly allowed by the RPC and would still leak.

**Fix:** as part of #1, do the contract delta in a trigger on status transitions; that automatically reverses on `approved → rejected` or `approved → draft`.

### 7. `Send to TC (Work in Progress)` skips assignment validation properly but `Submit for approval` bypass is loose
`canSubmit` returns true for `'rejected'` too, but the rejection note remains visible and there is no "incorporate the rejection into a revised version" step. The TC just resubmits the same numbers.

**Fix:** on resubmit from `rejected`, prompt for a short "what changed" note, append it to activity, and clear `rejection_note`. Why: GCs need to see why the same CO came back.

### 8. NTE cap warning ignores materials and equipment
`nteUsedPercent` is computed from `laborTotal` only (intentionally per comment). But the GC sees `grandTotal` on the banner, so a CO can pass the 100% NTE labor check yet still hit the GC with a much higher invoice.

**Fix:** show two NTE bars to the TC ("Labor vs cap" and "Total vs cap") and block submit if either exceeds the cap. Why: the cap is a contract limit on the customer-facing total, not a labor budget.

## Medium (UX / clarity)

### 9. `COAcceptBanner` infers the inviter org by exclusion
Line 33: `collaborators.find(c => c.organization_id !== myOrgId)?.organization?.name`. With multiple collaborators (TC + FC + sub-FC) the wrong org is shown as inviter.

**Fix:** look up by `co.org_id` (creating org) and only fall back to "Someone".

### 10. `CONextActionBanner` shows "Submit to GC" with raw `grandTotal` even when toggle is ON
Line 32 & 64 use `tcBillableToGC + materialsTotal + equipmentTotal` for the "Approve" CTA, but the TC's "Submit to GC" CTA shows `financials.grandTotal` — these are now equal but used to drift. Consolidate so both sides see the **same** number.

**Fix:** expose a single `priceToUpstream` field on `COFinancials` and use it in both banners and the sticky footer.

### 11. `requestFCInput` only auto-fires when there is exactly one FC org
With multiple FCs, the user is scrolled to a non-existent `#fc-request-card` element in `CODetailLayout` (it lives in the sidebar at certain widths and is hidden on mobile). Mobile users tap and nothing happens.

**Fix:** open a small selector dialog instead of relying on scroll-to-anchor.

### 12. Activity feed misses important transitions
`forward_change_order_to_upstream_gc`, `requestFCInput`, `completeFCInput`, and `closeForPricing` from the banner all bypass `logActivity` (only `COStatusActions` logs it). The activity tab will be missing key events when the user uses the next-action banner.

**Fix:** route every state transition through one helper that always logs activity + sends notifications, or add `logActivity` calls inside `useChangeOrderDetail`'s mutations' `onSuccess`.

## Suggested order

1. #1 + #6 + #4 together (contract integrity rewrite — trigger-driven).
2. #2 (FC submit branch) and #5 (delete row UI) — small, high impact.
3. #8 NTE total bar.
4. #3 paired-entry ID migration.
5. Remaining UX items (#7, #9, #10, #11, #12).

I'll wait for your go-ahead before changing anything; some of these (especially #1 and #4) need a migration and I don't want to ship them silently.