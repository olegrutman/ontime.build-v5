# Roadmap
- [ ] Show all itemized labor in the sidebar, separately from frozen submitted/approved pricing; verify WO-5 and phone layouts
- [x] Include subcontractor-added work in submission pricing and itemized invoices, preserving frozen approval limits; 20 regression tests passed and automatic build checks passed
- [x] Verify signed-in Knowles itemized invoice creation/readback: saved $1,200 draft INV-KNO-IM-HA-WO05-0001 with source entry tracking; previously reported combined draft is no longer present, and existing approved WO-5 prices were not increased without renewed approval
- [x] Replace PO Design A with approved Design B Guided Workspace; 20 tests and build pass. Signed-in lumber rail edits, product cards, 294→588 package quantities and order readback verified at 1280/320/394px; hardware rail and 20 EA order readback verified. Broader phone audit sampled 40 views and flagged existing dashboard clipping; repeat picker audit blocked after preview account access changed.
- [x] Implement approved PO picker Design A; 19 tests and build pass, signed-in category/search/package addition and 100 EA order readback checked at 1280/320/394px. Full account audit remains blocked by existing password-sign-in failure.
- [x] Add Lumber Type before framing lumber dimensions; 19 tests pass, signed-in type/size/length/species selection and order readback verified at desktop/320/394px; picker layout clear, broader phone audit flags four existing unrelated views
- [x] Add guided hardware family, application and size choices within five steps, with model search and smart Back
- [x] Test hardware classification/navigation (18 tests) and verify signed-in selection, smart Back and 20-piece box readback at desktop/320/394px; hardware layouts clear. Broader account audit flags existing access-denied/dashboard overflow outside this task.
- [x] Show total pieces in package counters; 5 tests pass, live 294 → 588 and order item 588 EA verified; 320/394px counter checks clear (full audit blocked by existing account sign-in failure)
- [x] Fix active supplier-scoped catalog filtering; live 2×4 / 10 ft / Doug Fir returns the correct item and random-length aliases are unified
- [x] Restore 948 documented package conversions; verify two boxes of 25 read back as 50 EA, nine regressions pass, phone 320/394px checks clear; 59 ambiguous conversions deliberately remain unavailable
- [x] Replace Ontime Master Catalog with approved v2: 1,719 active products, 1,588 reference prices, 131 unpriced; preserve matching IDs and retire 33 absent products
- [x] Verify database counts/units, saved reference-price bases, existing supplier priority and signed-in PO picking (new Hardie item and SH drywall added to unsaved orders)
- [x] Show pricing readiness consistently on CO/WO list and detail without changing approval states
- [x] Test readiness rules and verify live priced/internal/approved orders (17 tests; list/detail matched; 72 phone views without issues)

- [x] Move crew pricing switch into Scope & Labor and safely clear derived billing when disabled
- [x] Verify saved switch changes, provenance-scoped clearing and phone layouts (46 tests; live WO off/reload; 320/394px; separate supplier-access toast overflow found)
- [x] Make the crew pricing choice a prominent two-option control with saving feedback
- [x] Verify both choices on the live order, saved state on reload, phone layout and 72-page phone audit (0 issues)


- [x] Catalog Management cleanup: active-only health counts, unified CSV/Excel preview, replace-impact preview, import guide, retire confirm, price feedback, full export

- [x] Show the supplier project estimate open by default with a clear toggle and item count; remove duplicate actions
- [x] Verify the estimate toggle with live records and phone layouts (195 items / 10 packs; 18 tests; 68 phone views without clipping)

- [x] Audit reachable supplier KPI definitions and reconcile live dashboard/project totals; reviewed dormant legacy surfaces separately
- [x] Correct supplier KPI mismatches and verify 44 regressions, all 22 live dashboard/overview popups, order/invoice summaries and invoice filtering

- [x] Unify operational KPI cards with the overview card anatomy without changing calculations
- [x] Verify live breakdowns, financial regressions and phone layouts (53 tests; signed-in dashboard/overview dialogs; 68 supplier phone views)

- [x] Simplify Crew Cost KPI presentation without changing financial calculations
- [x] Verify the cost breakdown and phone layouts against live project data

- [x] Align Project Info colors and headings with operational pages and add phone exit navigation
- [x] Verify Project Info navigation and layout at desktop and phone widths

- [x] Tailor Project Info contract values to each company and enforce creator-only editing
- [x] Verify contract privacy, creator locks, and Project Info on phone widths

- [x] Separate daily workers and hired job crews, with project task picking and progress draws
- [x] Split private labor budget into worker payroll and hired crews without double counting
- [x] Verify progress limits, privacy, saved draws and phone layouts

- [x] Show private crew expenses as overview costs and add labor/materials/tools budgets
- [x] Verify saved budgets, actual totals, privacy and phone layouts

- [x] Build private project-based Crew Tracker with saved hourly/day rates, labor and expenses
- [x] Verify cost calculations, private access and phone-width logging

- [x] Audit shared mobile controls and high-traffic screens for distorted boxes and text overflow
- [x] Apply reusable mobile-safe sizing and wrapping fixes
- [x] Verify main screens at phone width and confirm the build
- [x] Correct remaining page-specific mobile text overflow and floating-control overlap
- [x] Audit all reachable role views and major screens at 320px and 394px
- [x] Phone-width layout checker across every screen for every company type (scripts/mobile-audit)
- [x] Rebuild the public landing page as an illustrated connected-jobsite story

- [x] Apply and verify the selected Connected Vertical Flow landing design
- [x] Resolve proposal parties from actual project relationships for all three billing directions
- [x] Apply Classic Contract PDF with issuer branding and complete work-order descriptions
- [x] Verify proposal creation and PDF download with real project data

- [x] Let crews collapse the "Your budget & spending" card and remember the choice per project
- [x] Verify collapse, remembered state, summary figures and phone layouts
- [x] Supplier dashboard: build Design B (project cards w/ stage bar, filters, deliveries + AR sidebar)

- [x] Redesign the expanded scope-item card as two labeled ledgers (locked crew work with plain-language math, editable billing) per approved Design A
- [x] Verify the expanded card live on WO-5 at desktop and 320/390px (no overflow; temporary design preview removed)
