

# Combine Project Creation + Setup Wizard into One Flow

## Current Problem (Two Separate Flows)

Right now there are **two disconnected steps**:

1. **Create Project page** (`/create-project`) — asks for name, address, type, team, then creates the project record
2. **Project Setup page** (shown after navigating to the project) — runs the V2 wizard for building type, scope questions, contract value, SOV generation

This means the user fills in basics, creates the project, gets redirected, then has to go through setup again — with data being seeded from step 1 into step 2. Redundant and confusing.

## Proposed Unified Flow

Merge everything into a **single wizard** on the `/create-project` page:

```text
Step 1: Project Basics (name, address, city/state/zip, start date)
Step 2: Building Type (the 6-tile selector — replaces old "Project Type" dropdown)
Step 3: Contract Value + Scope Questions (structure, roof, envelope, etc.)
Step 4: Project Team (invite GCs/TCs — same as current TeamStep)
Step 5: Summary + Review (all answers, SOV preview, team list)
→ "Create Project" saves everything at once
```

**What happens on "Create Project":**
- Creates the `projects` row (from basics)
- Saves setup answers to `project_setup_answers`
- Creates `project_contracts` with contract value
- Creates `project_sov` + `project_sov_items` from generated lines
- Saves team members + sends invites
- Navigates to `ProjectSetupFlow` which now only shows the **editable SOV card** (wizard is already done)

## Key Design Decisions

1. **Building type replaces project type dropdown** — the V2 wizard's 6 building types are more specific than the old dropdown. The selected building type maps to a `project_type` value when saving.

2. **Project record created at the end** (not after step 1) — currently `saveBasics` creates the project on step 1 so TeamStep has a `projectId`. We keep this behavior: project is created when leaving step 1, team step uses that ID. But the wizard + SOV save happens on final "Create Project" click.

3. **Post-creation setup page simplified** — `ProjectSetupFlow` only shows the SOV editor card since the wizard is already complete. If user returns to an in-progress project that wasn't fully created, they see the wizard again.

4. **GC vs TC differences** — both org types go through the same flow. The scope questions already adapt based on building type. Team step already adapts based on creator org type (GCs add TCs, TCs add GCs and field crews).

## Files Changed

| File | Change |
|------|--------|
| `src/pages/CreateProjectNew.tsx` | Replace 3-step wizard with 5-step unified flow: Basics → Building Type → Scope/Contract → Team → Review. On final save, run full persistence (project + answers + contract + SOV + team). |
| `src/components/project-wizard-new/BasicsStep.tsx` | Remove "Project Type" dropdown (replaced by building type selector in step 2). |
| `src/components/project-wizard-new/ReviewStep.tsx` | Expand to show scope answers summary + SOV preview + team list (reuse `WizardSummary` content). |
| `src/components/setup-wizard-v2/SetupWizardV2.tsx` | Extract scope question panel into a reusable component (`ScopeQuestionsPanel`) that can be embedded in the create-project wizard without the full split-screen layout. |
| `src/hooks/useSetupWizardV2.ts` | Make the hook work without a `projectId` initially (answers stored in memory until save). Add a `saveAll(projectId)` method that persists everything in one shot. |
| `src/components/project-setup/ProjectSetupFlow.tsx` | Simplify — if wizard is already complete (SOV exists), only show SOV editor card. No need for the wizard card. |
| `src/types/projectWizard.ts` | Remove `PROJECT_TYPES` array (no longer needed — building type selector replaces it). Update `ProjectBasics` to remove `projectType` field. |

