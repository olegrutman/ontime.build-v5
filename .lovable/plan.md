# Replace TC / FC / GC abbreviations with company names — UI sweep

## Goal
Anywhere a user reads a label, badge, column header, toast, audit message, KPI title, etc., we stop showing "TC", "FC", or "GC" and instead show the actual company on the current project. Where there is no specific project context (e.g. global filters, org-creation forms), we fall back to the spelled-out role: "Trade Contractor", "Field Crew", "General Contractor".

Code identifiers, DB columns, query keys, role enums (`'TC' | 'FC' | 'GC'`), and source comments stay exactly as they are. **UI strings only.**

## Architecture (one source of truth)

Today there is already `src/hooks/useRoleLabels.ts` that resolves per-project label overrides from `projects.role_label_overrides`. We extend it so the **default label** for each role on a project is the actual organization on `project_participants` (instead of the constant "Trade Contractor" / "Field Crew" / "General Contractor"). Manual overrides on the project still take priority.

### Hook contract — `useProjectOrgLabels(projectId)`

New thin wrapper (or a rewrite of `useRoleLabels`) that returns:

```ts
{
  GC: string;              // "Haley Custom Homes" or "General Contractor" if none yet
  TC: string;              // "IMIS, LLC" — if multiple TCs: "Trade Contractors"
  FC: string;              // "Pacifico Builders" — if multiple FCs: "Field Crews"
  GCShort: string;         // first word, e.g. "Haley"
  TCShort: string;
  FCShort: string;
  label(code, opts?): string;   // resolves any RoleCode
  short(code): string;
  /** When you need the role *of a specific org* (CO collaborator, labor entry author) */
  forOrg(orgId): string;
}
```

Resolution order per role:
1. Explicit override in `projects.role_label_overrides[code]` (existing).
2. The single accepted org with that role on `project_participants` → its `organizations.name`.
3. If 0 or multiple orgs with that role → spelled-out fallback ("Trade Contractor" / "Trade Contractors").
4. Never the bare 2-letter code.

Implemented as one query on mount: `project_participants` joined with `organizations` for the project, cached for 5 min (matches existing TTL).

For **global, no-project context** (e.g. org settings, sign-up, admin user list), import a constant `ROLE_LONG_NAMES = { GC: 'General Contractor', TC: 'Trade Contractor', FC: 'Field Crew' }` and use it directly — never the abbreviation.

### Where pronouns matter ("you" vs the company name)
For toasts shown to a user *about themselves* ("You approved this CO"), we keep "you". For messages about the *other side* ("Approved by TC") we substitute the org name ("Approved by IMIS, LLC"). Most existing copy already uses passive forms — we only swap the noun.

## Scope of the UI sweep

`rg "\b(TC|FC|GC)\b" -g '*.{ts,tsx}' src/` returns 182 files; after stripping out role-enum comparisons, identifiers, comments, and audit-payload string codes, we have **~60–80 files with user-visible strings**. Cataloged into 8 areas — full file lists in the technical appendix.

| Area | Examples of strings to swap |
|---|---|
| 1. Change Order detail/list | "TC Submitted Price", "GC Approval", "FC pricing", "TC margin", `COKPIStrip`, `COStatusActions`, `COBoardCard`, `COAuditLog`, audit log row "Approved by TC" |
| 2. CO/WO wizards | `picker-v3/StepWho`, `StepPricingAndRouting`, `PickerShell` — "Assign to TC", "FC Pricing", "TC fixed price" |
| 3. Invoices / Purchase Orders / Returns / Backcharges | column headers ("From TC / To GC"), filters, status toasts, PDF templates that render "TC" or "GC" inline |
| 4. Project Overview pages | `GCProjectOverviewContent.tsx`, `TCProjectOverview.tsx`, `FCProjectOverview.tsx` headings, "TC Contract" cards, "Passed to TC", table headers |
| 5. Project Setup wizard | `useSetupWizardV2` question copy ("GC supplies materials" → "{Owner name} supplies materials" or fallback "General Contractor supplies materials"), step titles, summary screen |
| 6. SOV pages | "TC SOV", "GC SOV", "FC SOV" labels and tab names |
| 7. Notifications & toasts | `lib/coNotifications.ts` body copy ("TC is requesting…", "by TC") and any `toast.success/error` strings |
| 8. Settings, Profile, Dashboard, Team, Partners, EditProject, ProjectSettings, Quick-Capture, Estimates, Reminders | "Only GC can…", "TC pricing defaults", "Use FC input as pricing base" |

**Excluded from this sweep (per your "UI only" answer):**
- DB columns (`tc_submitted_price`, `gc_budget`, `co_*` tables)
- TS types / enums (`'TC' | 'FC' | 'GC'`)
- Variable / function / file names (`useTCPricing`, `GCApprovalCard.tsx`, etc.)
- Comments and `// TODO`s
- `audit_log.action_payload` JSON values stored historically
- Platform-admin-only screens that intentionally show the role classification (e.g. `PlatformQA.tsx` colored debug badges) — these are internal diagnostics, not customer copy. Confirm if you want those swept too; default I'll leave them.

## Execution plan (sequenced PRs)

Because 60+ files is too big for one safe sweep, split into 5 batches. Each batch is independently shippable; nothing breaks if a later batch is not yet done — files just keep showing the abbreviation.

1. **Batch 1 — Hook + 0 visual change.** Extend `useRoleLabels` to resolve org names from `project_participants`. Add `useProjectOrgLabels` re-export. Add `ROLE_LONG_NAMES` constant. Existing call sites unchanged.
2. **Batch 2 — Change Orders.** All CO surfaces (detail page, list cards, wizards, audit log, notifications, KPIs). Highest-traffic, most abbreviation-heavy area. Includes `coNotifications.ts`.
3. **Batch 3 — Project Overview, SOV, Project Setup wizard.**
4. **Batch 4 — Invoices, POs, Returns, Backcharges, Payment Apps, PDF templates.**
5. **Batch 5 — Settings, Profile, Dashboard, Team, Partners, Estimates, Reminders, Quick Capture, EditProject — the long tail.**

## Verification per batch

After each batch:
1. Run `rg -n "(>|\"|')(TC|FC|GC)( |:|<|\"|')" src/<batch-dirs>` — should return 0 matches except known excluded files.
2. Visually load 2–3 representative pages from that area in the preview as a GC user, then as a TC user, and confirm the substitutions read naturally and never collide (e.g., "IMIS, LLC IMIS, LLC margin").
3. Edge case: project with **no** TC accepted → shows "Trade Contractor" fallback, never blank, never "TC".

## Technical appendix (files, partial — full list generated during execution)

Top files by raw `(TC|FC|GC)` count, after filtering out files that are pure code (no JSX text):
- `src/components/project/TCProjectOverview.tsx` (and `GC*`, `FC*` siblings)
- `src/components/change-orders/COKPIStrip.tsx`, `COStatusActions.tsx`, `COBoardCard.tsx`, `COAuditLog.tsx`
- `src/components/change-orders/picker-v3/StepWho.tsx`, `PickerShell.tsx`, `StepPricingAndRouting.tsx`
- `src/components/project/AddTeamMemberDialog.tsx`, `GCProjectOverviewContent.tsx`
- `src/components/invoices/InvoicesTab.tsx`
- `src/hooks/useSetupWizardV2.ts` (UI question copy only — not the routing/branching logic)
- `src/lib/coNotifications.ts`
- `src/pages/{Dashboard, EditProject, ProjectSettings, Profile, EstimateApprovals, GCProjectOverview}.tsx`
- ~50 more lower-count files identified during Batch 1 by re-running the grep with the same exclusions

## What I will NOT change without asking again
- Any DB schema or enum value
- File names / component names containing "GC" / "TC" / "FC"
- Memory entries or in-source comments
- Platform-admin debug badges in `PlatformQA.tsx`
