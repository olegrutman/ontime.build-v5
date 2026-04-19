

## Goal

Two improvements on `/create-project`:

1. **Contracts step** — show **full company names** for each contract value (instead of "GC", "TC", "Field Crew" labels), so the user knows exactly *who* the contract is with.
2. **Scope step** — break the long question list into **collapsible accordion sections** (Structure / Roof / Envelope / Backout / Exterior) so the SOV preview stays visible and the user doesn't have to scroll a tall page.

---

## Change 1 — Contracts step: real company names

In `ContractsStep.tsx`:
- Accept new props: `creatorOrgName?: string` and `team?: TeamMember[]`.
- Resolve names from the team list collected in Step 1 (Basics):
  - **Upstream party** (the org paying the creator):
    - GC creator → "Owner / Client" (no upstream in team) → just label `Contract Value` with creator's full org name as the receiving party.
    - TC creator → find first team member with `role === 'General Contractor'` → use their `companyName`. Fallback `"General Contractor"` if none added yet.
    - FC creator → find first `'Trade Contractor'` member.
  - **Downstream party** (only relevant for TC creator on the FC card):
    - Find first `role === 'Field Crew'` team member → use `companyName`. Fallback `"Field Crew"`.
- Update card titles/labels to interpolate the resolved names:
  - GC card title: `Contract Value` + subline `{creatorOrgName} (Project Owner) — receiving payment`
  - TC upstream card title: `{gcCompanyName} → {creatorOrgName}` with sublabel `What is {gcCompanyName} paying you?`
  - TC downstream card title: `{creatorOrgName} → {fcCompanyName}` with sublabel `What are you paying {fcCompanyName}?`
- Wire props from `CreateProjectNew.tsx` (`creatorOrgName={currentOrg?.name}`, `team={team}`).
- Add a small helper inside `ContractsStep.tsx` (or a new `src/lib/wizardCounterparty.ts`) to centralize the resolution.

Edge case: if no matching team member exists, fall back to generic role label and show a tiny inline hint: `Tip: Add a {Role} in Step 1 to name this contract.`

---

## Change 2 — Scope step: keep both questions and SOV on one screen

Currently `ScopeQuestionsPanel.tsx` renders **all sections stacked vertically** in the left column (Structure → Roof → Envelope → Backout → Exterior). Long enough that user must scroll; SOV preview stays put but the question column dwarfs it visually.

**Proposed layout** — convert the section list into a `shadcn/ui` `Accordion` (type="single", collapsible, defaultValue first non-empty section):

```
┌──────────────────────────────────────────────┬──────────────────┐
│ Scope                                        │ SOV Preview      │
│ Answer questions… SOV updates live.          │ (sticky, scroll) │
│                                              │                  │
│ ▼ Structure  (3/5 answered)                  │  $500,000 100%   │
│   • Number of stories per unit               │  1. Mobilization │
│   • Has basement?                            │  2. Per Floor    │
│   • Mobilization as separate item?           │  …               │
│                                              │                  │
│ ▶ Roof  (2 questions)                        │                  │
│ ▶ Envelope (1 question)                      │                  │
│ ▶ Backout (4 questions)                      │                  │
│ ▶ Exterior (3 questions)                     │                  │
└──────────────────────────────────────────────┴──────────────────┘
```

Details:
- Use `Accordion` from `@/components/ui/accordion` with `type="single"` `collapsible`.
- **Default open**: first section that has at least one unanswered visible question; fallback to first non-empty.
- **Auto-advance**: when all questions in the open section are answered (non-null), auto-open the next section with questions. Keeps user moving forward without hunting.
- **Section header shows progress**: `Structure (3 of 5)` — small muted counter on the right side of the trigger.
- Skip rendering empty sections entirely (same as today).
- The SOV preview column already uses `h-[calc(100vh-280px)]` + `overflow-y-auto`, so it naturally stays in view as the left column collapses sections. No change needed there.
- Drop the outer `overflow-y-auto pr-2` on the question column (no longer needed once content is collapsed); keep `space-y-3`.

Mobile: `lg:grid-cols-2` → on `<lg`, single column. Accordion still works; SOV stacks below — that's fine and matches existing behavior.

---

## Files to modify

- `src/components/project-wizard-new/ContractsStep.tsx` — add `creatorOrgName` + `team` props, resolve counterparty names, update card titles and labels.
- `src/pages/CreateProjectNew.tsx` — pass `creatorOrgName` and `team` to `<ContractsStep …/>` (one-line change).
- `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx` — wrap section loop in `Accordion`, add per-section progress counters, add auto-advance effect.

## Files NOT touched

- `SOVLivePreview.tsx`, `WizardQuestion.tsx`, `useSetupWizardV2.ts` — no logic change.
- Building Type, Basics, Review steps — unaffected.

## Verification

- **Contracts (TC creator)** — both cards show the actual GC and FC company names from Step 1; if a role wasn't added in Basics, show generic label + tip.
- **Contracts (GC creator)** — single card shows "Contract Value" with creator org name as the receiving party.
- **Scope** — only one section open at a time; collapsed sections show counters; SOV preview always visible at viewport size 1366×768; completing a section auto-opens next.
- **Mobile (390px)** — accordion works, SOV stacks below scope, no overflow.
- **Draft persistence** — existing sessionStorage flow unaffected (we only touch presentation).

