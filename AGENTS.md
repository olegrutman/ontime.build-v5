# Project architecture rules

- Project Info derives headline revenue from the viewer's own earning contracts, never the sum of revenue and downstream costs; shared details and contract edits use their respective user-level creator identities.

- Crew Tracker posts spending once into actual_cost_entries and stores reusable workers separately; this keeps project financials on one ledger without counting labor twice.
- Hired crew tasks hold pricing and cumulative progress separately from daily workers; progress draws lock the task and post only actual payments to the shared private cost ledger, because completed work is not automatically paid payroll.
- Crew project budgets are organization-private and separate from upstream contracts; overview actual costs count ledger spending once, while forecasts use the greater of budget and actual in each expense category.

- Shared interactive primitives must keep fixed controls non-shrinking and allow text to wrap safely on phone-width screens, because page-specific overflow fixes are inconsistent.- Run `scripts/mobile-audit/mobile_audit.py` (per account, 320/394px) after layout changes, because page-wide checks miss text clipped inside cards.
- Keep the public landing experience isolated from the signed-in Command Center design system, because marketing typography and storytelling must not alter operational screens.
- Resolve proposal parties through the authorized proposal_parties RPC and persist the contractual recipient; PDF exports must validate issuer-scoped RLS before rendering, because downstream agreements and private costs must not leak across companies.
