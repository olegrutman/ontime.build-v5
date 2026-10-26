# Project architecture rules
- PO Guided Workspace presentation is opt-in on the shared SmartPicker and reuses the existing funnel/quantity logic; the PO wizard owns supplier and order controls so change-order material pickers retain their context and behavior.

- CO/WO pricing readiness is a shared viewer-role-scoped presentation calculation, not a stored lifecycle state; this keeps list/detail consistent without bypassing crew or upstream approval.

- Crew-base billable rows and mirrored costs carry explicit provenance; switching the order-wide base off clears only these rows atomically, preserving manual entries and upstream submission freezes.

- Project Info derives headline revenue from the viewer's own earning contracts, never the sum of revenue and downstream costs; shared details and contract edits use their respective user-level creator identities.
- Project Info uses semantic command-surface tokens and shared section headings, so operational styling stays consistent without changing contract or creator safeguards.

- Crew Tracker posts spending once into actual_cost_entries and stores reusable workers separately; this keeps project financials on one ledger without counting labor twice.
- Hired crew tasks hold pricing and cumulative progress separately from daily workers; progress draws lock the task and post only actual payments to the shared private cost ledger, because completed work is not automatically paid payroll.
- Crew project budgets are organization-private and separate from upstream contracts; overview actual costs count ledger spending once, while forecasts use the greater of budget and actual in each expense category.

- Shared interactive primitives must keep fixed controls non-shrinking and allow text to wrap safely on phone-width screens, because page-specific overflow fixes are inconsistent.- Run `scripts/mobile-audit/mobile_audit.py` (per account, 320/394px) after layout changes, because page-wide checks miss text clipped inside cards.
- Keep the public landing experience isolated from the signed-in Command Center design system, because marketing typography and storytelling must not alter operational screens.
- Resolve proposal parties through the authorized proposal_parties RPC and persist the contractual recipient; PDF exports must validate issuer-scoped RLS before rendering, because downstream agreements and private costs must not leak across companies.

- Operational KPI cards use shared KpiCard; adapters preserve values, basis, privacy and drilldowns, while connected pipelines and document money bars retain their specialized layouts. This keeps presentation uniform without changing ledger math.

- Supplier KPI calculations use shared supplierMetrics status, tax and PO-scoped coverage helpers; estimate totals and PO totals are already tax-inclusive, while estimate lines require their source estimate tax, preventing quote commitments, duplicate tax and cross-order offsets.
- Master-catalog replacements upsert by supplier and stable Ontime SKU and retire missing products; base ordering units and reference-price units remain separate, with unvalidated package conversions stored only as metadata, to preserve historical links and prevent pack prices from becoming each prices.
- PO catalog funnels query only active rows for the selected supplier, and package counts multiply documented base-unit quantities; ambiguous or nested package evidence stays metadata to prevent empty selections and incorrect order units.
- Hardware guidance derives family/application/size from explicit catalog text in a shared pure classifier, paginates the supplier's active candidates, and retains unclassified products; this avoids invented fit specifications and truncated hardware selections.
- Framing lumber type is the first field in the shared structured catalog funnel; display labels never replace stored filter values, preserving supplier-specific choices and scoped results.
