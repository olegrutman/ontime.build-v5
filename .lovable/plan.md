## Comprehensive QA Audit + Fix Plan

You've asked for a full audit across every role and every major module, followed by fixes for every bug found. This is a large multi-turn effort. Here's how I'll execute it.

### Phase 1 — Static / backend sweep (no UI yet)
Run in parallel where possible:
1. **Supabase linter** + **security scan** → surface RLS gaps, missing GRANTs, policy recursion, SECURITY DEFINER issues, exposed PII.
2. **DB integrity queries** — orphan rows, NULLs in required FKs, SOV sums ≠ 100, invoices exceeding contract sum, COs with broken `apply_co_contract_delta` state, project_participants vs project_team drift, projects stuck in setup, duplicate org_codes.
3. **Edge-function logs** — recent errors across `generate-sov`, `parse-estimate-pdf`, `send-co-*`, `generate-*-pdf`, etc.
4. **Codebase scan** — TODO/FIXME/`@ts-ignore`, hardcoded role strings (violates org-type-from-DB rule), `console.error` swallows, missing `await`, unhandled promise rejections, `.single()` that should be `.maybeSingle()`, `eq('organization_type'…)` leftovers, dead imports.
5. **Type drift** — `src/integrations/supabase/types.ts` vs actual DB (esp. recent `reset_project_setup` function and `setup_completion_required` column).

### Phase 2 — Per-role functional sweep (browser, seeded test users)
For each of **GC (gc@test.com)**, **TC (tc@test.com)**, **FC (fc@test.com)**, **Supplier**, and **Platform admin**, walk:

- Auth: login, signup, magic link, password reset, OTP, signout, role-switch (if multi-org), 2FA path for platform.
- Dashboard: KPIs, role-specific cards, expandable KPI behavior, mobile layout (390px).
- Projects list / Archive: create project (full wizard V2 each org type), re-run setup wizard (recent fix), dual-contract flow for TCs, building-type sequencing, draft persistence.
- Project home: contract editing, readiness/authority gating, team invites, role-based privacy of margins/budgets.
- SOV: lock/unlock, edit lines, dual-SOV sync, deletion → billed decrement, sum-to-100 enforcement, FC visibility limits.
- Contracts & SOW: lock before finalize, scope inclusions/exclusions, cross-org leakage.
- Change Orders / Work Orders: wizard (scope+routing only, no pricing), detail page, TC submitted price freeze, GC budget visibility, FC collaboration pipeline, approval/rejection → `contract_sum` delta, T&M WO flow.
- Invoices: submit, approve, revise-resubmit clears data, T&M path, SOV alignment, numbering convention, draft-exclusion in rollups, FC sees own only.
- Purchase Orders: wizard, 6-state lifecycle, price-lock at Ordered, tax application, supplier-pricing privacy from TCs.
- Materials / Estimates: PDF parse polling, estimate→PO conversion progress, supplier inventory, returns + credit memos.
- RFIs, Daily Logs, Field Captures, Reminders, Notifications (icon/color map, redirect routing, dashboard-banned types).
- Exports: PDF generation for invoice / PO / WO / payment app / project summary, RLS context.
- Settings: profile, org, team management, role rules, subscription / feature gates.
- Platform admin: Users, Orgs, Projects, Plans, KPIs, Roles, Logs, Setup, Impersonation, Provisioning, QA tools.
- Mobile (390px) for FC + GC dashboard and project pages, persistent sidebar z-index against modals/wizards.

For each I'll capture: severity (Critical / High / Medium / Low), repro, file:line, root cause.

### Phase 3 — Bug report
Deliver one ranked markdown report grouped by severity, with cross-references to the files involved. No code is changed yet.

### Phase 4 — Fix pass (build mode)
Work top-down by severity:
1. Critical first (data loss, privilege escalation, RLS leak, financial corruption, total-blocker UI). Each fix is its own commit-sized change with: code edit → migration if needed → quick verification (re-run scan, requery DB, or browser re-check).
2. High next (broken core flows, wrong totals, missing role-privacy).
3. Medium (UX breakage, missing states, wrong copy with functional impact).
4. Low (visual polish, minor inconsistencies).

After each batch I'll re-run the relevant Phase 1 checks to confirm no regressions and update `mem://` if a rule changed.

### Expected output to you
- A single ranked bug report at the end of Phase 3.
- Then sequential fix turns. I'll pause after Critical+High are done so you can sanity-check before I continue into Medium/Low.

### Scope notes
- Will mutate test-account data (create projects, COs, invoices, approve, delete). Won't touch real org data or platform settings beyond toggling for tests, restored after.
- Won't refactor anything not tied to a bug.
- Won't redesign UI — only fix what's broken.
- T&M flows, supplier pricing privacy, and `apply_co_contract_delta` trigger get extra scrutiny per project memory.

Approve and I'll start Phase 1.