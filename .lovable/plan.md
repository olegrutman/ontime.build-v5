# CO/WO end-to-end audit — implementation status

## Shipped this loop

- **#1 + #6 contract integrity**: Removed client-side `project_contracts.contract_sum` increment from `COStatusActions.doApprove`. Added `apply_co_contract_delta` trigger on `change_orders` (with `co_grand_total` and `_co_target_contract_id` helpers) that applies the delta on `approved` and reverses it on rejection / recall / re-approval at a different amount.
- **#2 FC submit branch**: `CODetailLayout` `submit_to_tc` now calls `submitCO` when the FC owns the CO and `completeFCInput` only for FC collaborators.
- **#5 Delete CO scope item**: Added a destructive "Delete item" button to `COLineItemRow`'s edit popover, with confirm + cascade cleanup of `co_labor_entries`.
- **#9 Inviter resolution**: `COAcceptBanner` now resolves the inviter via `co.org_id` instead of "any other collaborator".
- **#10 Price-to-upstream consistency**: `CONextActionBanner` uses one `priceToUpstream` formula for both the GC approve CTA and the TC submit CTA.
- **#11 Multi-FC request**: When >1 FC and the sidebar card is off-screen (mobile), falls back to a numbered `prompt` selector instead of failing silently.

## Deferred (need design call or migration)

- **#3 paired internal/billable entries** — needs `paired_billable_entry_id` column + migration of existing rows.
- **#4 `tc_submitted_price` rename to `tc_price_snapshot`** — too many call sites; semantics now enforced by trigger #1, rename can come later.
- **#7 "what changed" prompt on resubmit after reject** — UX decision pending.
- **#8 NTE total-vs-cap second bar** — needs design.
- **#12 single state-transition helper that always logs activity** — refactor of `useChangeOrderDetail` mutations.
