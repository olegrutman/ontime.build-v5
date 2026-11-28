# Crew item agreement check

## Rule
A crew sees its hiring company's decisions about its own pricing. Another agreement's approval or item completion must not say the crew's pricing was accepted or is available for billing.

## Verified live
- Pacifico on WO-STR-IM-EN-0006: both item windows at 2024, 394 and 320px show $15,500 own price and Not sent; neither exposes Encompass acceptance, Review needed, Available for billing, or a completion action. No records changed.
- IMIS on the same order: its Encompass acceptance and $25,200 agreed item price remain visible. No records changed.

## Source review
- COLineItemRow / COItemPricingDialog: one shared item-window renderer serves desktop, phone and direct-entry openings. Upstream review strip is hidden for crew collaborators; entry status and accepted billing amount derive from the crew's own entries. Completion affordance depends on crew acceptance. Completed upstream items no longer imply crew billing availability.
- agreementStatus / COAgreementTags: role-scoped tags; unrecorded decisions no longer count as acceptance alongside an approved entry. Explicit accepted billing amounts exclude pending, rejected, unrecorded, private and non-crew entries.
- COHeaderStrip / CORow / COApprovalTrail / FCInputRequestCard: existing company-specific handoff and status labels; margin warning stays with the hiring company. List trails show handoff, not the hiring company's upstream approval.
- COReviewHistory: separate agreement groups, read through party-scoped events, no client history mutation.
- COStatusActions: crew collaborators do not get the unrelated Approved fallback; order-wide completion remains subcontractor-only.
- COKPIStrip / WOBilledToDateCard / CODetailLayout: order-wide billing balances still use upstream order lifecycle/current crew price, not only accepted crew pricing. Outside the requested item-window change; needs separate billing fix.
- CreateInvoiceFromCOs / crewHourReview / list_billable_change_orders: T&M explicitly filters reviewed crew entries. Fixed-price/NTE paths can still rely on upstream approval; outside the requested item-window change and not fixed here.
- get_wo_billing_status / woProgressBillingData: existing invoice readback is scoped to issuer/recipient contracts and excludes rejected/voided invoices; no approval mutation.
- complete_co_item: existing protected server action still permits authorized crew completion based on upstream order/item approval; the item-window button is now gated, but server enforcement needs a separate completion change. No migration or permission change was made for this scoped window request.
- review_fc_labor_entry: decisions are restricted to the hiring subcontractor; explicit fixed-price handoff is currently enforced in the review UI, not the server action. Separate server hardening is not part of this window change.
- generate-co-pdf: billing parties and prices are viewer-scoped, but the internal approval trail uses the order's upstream timestamps. Printed approval trail needs separate agreement scoping; no stored PDF was regenerated.
- co-public-access: token-based owner/architect signing is its own upstream agreement; no crew item-window renderer or completion action.
- No separate background item-window approval or completion job was found in the reviewed entry points. Notifications and printed documents were not exercised live.

## Preserved
No prices, approvals, completed items, invoices, contracts, permissions, settings or example records were changed.
