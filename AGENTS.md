# Project architecture rules
- Subcontractor pending invoice KPI amounts, counts and breakdowns derive from the same full organization-directional invoice set, independent of recent activity limits; this prevents receivables and payables from mixing without changing other ledger totals.
- Invoice KPI sources union by invoice identity before summing; paid drilldowns use full directional records, and portfolio material commitments sum per-project maxima, preventing cross-link duplicates and cross-project offsets.
- CO detail labor costs deduplicate imported crew obligations by source-entry IDs rather than pricing toggles, preserving manual and unimported costs independently of billing mode.
- Operational dashboard KPI documents use complete scoped source sets separate from recent activity; CO forecasts use shared party-resolved revenue/cost aggregation, and cash balance labels exclude unbilled work, so totals reconcile without implying accrual profit.
- Auth hydration is identity-scoped and coalesced; same-user sign-in/token events never toggle route loading or refetch roles, because background session maintenance must preserve screen state.
- Home-screen metadata stays manifest-only; the same-path /sw.js kill-switch removes old Workbox shell caches for one release, leaving /push/sw.js untouched, because automatic shell activation previously forced reloads.
- Realtime bursts coalesce refreshes without changing mounted invoice/PO keys; overview financial queries run only on Overview and sidebar counts reuse organization-scoped cache, because navigation and edits must not reset forms or repeat unrelated work.
- Invoice creation preserves full source order references through shared numbering helpers and saved line descriptions; issued invoices are not renumbered, preserving document traceability and billing history.
- CO/WO correction versions are tracked atomically per editing organization; private costs never trigger upstream review, pending decisions are version-checked, and existing approvals remain unchanged until explicit acceptance.
- Approval-audit reminders use unique notification event keys and separate price drift, missing snapshots, submission, and closeout; drift stays private to the submitting company until an explicit revision is submitted.
- Approved-price revisions are immutable party-scoped records decided through authenticated RPCs; acceptance atomically applies only the price delta to the governing contract, while pending/rejected revisions preserve the original approval.
- Accepted price revisions apply their CO and contract delta through a protected revision trigger, so authorized approvals remain atomic without bypassing creator-only direct-edit guards.
- CO/WO sidebar labor totals present current viewer-role billable rows separately from frozen upstream pricing, so extra scope remains visible without expanding approval or revenue.
- Crew-base submission snapshots sum saved organization-owned billable labor once, including manual scope; invoice itemization preserves source-entry IDs and rejects approval mismatches rather than silently dropping work or expanding approved prices.
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
- Remodel/T&M projects get $0 GC↔Sub and Sub↔Crew contracts auto-created by ensure_tm_project_contracts (on participant accept / WO status change), because work-order approval and invoicing both require a contract between the two companies.
- WO progress billing derives billed-to-date from invoice lines tagged with source_co_id/source_entry_ids (never stored on the WO); approved WOs bill incrementally, and deleting an invoice releases its entries through the line cascade.
