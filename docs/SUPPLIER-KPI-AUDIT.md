# Supplier KPI audit

## Verified
- Signed-in supplier dashboard: all 10 KPI popups.
- Main Street Apartments: all 12 overview/analytics KPI popups, purchase-order summary, invoice summary and estimates.
- Filtering invoices to Draft preserves full financial KPI totals.
- 44 regression tests passed; preview build passed; no browser runtime errors.

## Reconciliation
Supplier_Test totals read independently from live records:

| Metric | Amount |
| --- | ---: |
| Approved estimates | $2,530,884.87 |
| Committed orders | $174,613.32 |
| Billed | $35,282.44 |
| Received | $35,282.44 |

Main Street Apartments: approved estimate $357,407.79; ordered $131,647.91; billed/received $18,586.78; unbilled $113,061.13; six delivered orders.

## Corrections
- Consistent committed, delivered, open and scheduled order statuses.
- Authoritative tax-inclusive PO totals; each estimate pack uses its own source tax rate.
- Supplier order counts are numbers, not currency.
- PO-scoped exposure and partial-invoice remaining balances.
- Closed net return credits only; pending returns are not described as issued credits.
- Invoice filtering no longer filters financial totals; monthly payment bounds exclude future months.
- Shared operational net-30 aging convention for overdue indicators; this is not a statutory lien deadline.
- Query failures on audited active totals show an error rather than plausible zero totals.

## Boundaries
Received means full invoice total for PAID invoices, as defined by the existing model, not independently recorded partial cash receipts. Live records have no closed return credits; closed-credit calculations are covered by regression tests rather than a live closed-return flow.

Dormant, unmounted legacy materials-control and financial-summary components were identified but not rebuilt; they must adopt the canonical helpers before being mounted again. No pricing, payments, returns or project records were mutated during verification.