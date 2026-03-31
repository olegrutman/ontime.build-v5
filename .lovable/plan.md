

# Unified Project Setup Pipeline

## What This Does
Merges Project Creation, Building Profile (Details Wizard), Framing Scope (11-section wizard), and Contract Setup into one continuous guided flow. Each phase feeds the next. The SOV is auto-generated from the completed scope + contract values.

## Current State (what exists)
- `CreateProjectNew` — basics only (name, type, address, team)
- `ProjectDetailsWizard` — building profile (stories, foundation, framing, features) → saves to `project_profiles`
- `FramingScopeWizard` — 11-section scope → saves to `project_framing_scope`
- `ProjectContractsPage` — contract sums, retainage, material responsibility → saves to `project_contracts`
- `ProjectSOVPage` — SOV generation/editing → saves to `sov_lines`

These are all separate pages with no guided connection.

## New Flow: 4 Phases in One Shell

```text
Phase 1: PROJECT & BUILDING          Phase 2: FRAMING SCOPE
┌──────────────────────────┐         ┌──────────────────────────┐
│ 1a. Basics (name/addr)   │         │ All 11 sections          │
│ 1b. Team (GC, FC, Supp)  │  ───►   │ (existing wizard,        │
│ 1c. Building Profile     │         │  pre-filled from 1c)     │
│     (type, stories,      │         │                          │
│      features, structure) │         │                          │
└──────────────────────────┘         └──────────────────────────┘
           │                                    │
           ▼                                    ▼
Phase 3: CONTRACTS                   Phase 4: SOV & FINISH
┌──────────────────────────┐         ┌──────────────────────────┐
│ 3a. Upstream contract    │         │ Auto-generate SOV from   │
│     (GC→TC: sum, ret%)   │  ───►   │ scope + contract value   │
│ 3b. Downstream contracts │         │ Review, adjust, lock     │
│     (TC→FC: sum, scope)  │         │ Activate project         │
│ 3c. Material resp.       │         └──────────────────────────┘
│ 3d. Supplier assignments │
└──────────────────────────┘
```

## Key Design Decisions

### Phase 1c replaces ProjectDetailsWizard
The building profile questions (type, stories, foundation, framing system, garage, stairs, elevator, etc.) move INTO the unified flow as sub-steps within Phase 1. This data feeds directly into Phase 2 (the framing scope wizard already consumes `buildingType`).

### Phase 2 is the existing FramingScopeWizard
No rebuild needed — it already works. It just gets embedded as Phase 2 of the unified shell instead of being a standalone tab. The `buildingType` and `matResp` are now pre-seeded from Phase 1 and Phase 3 respectively.

### Phase 3: Contracts are inline
Instead of a separate contracts page, contract setup becomes Phase 3:
- **Upstream** (who's paying you): GC contract sum, retainage %, material responsibility
- **Downstream** (who you're paying): FC contracts with scope assignments
- Material responsibility answer from here flows BACK to update Phase 2 scope display (already stored in `project_framing_scope.answers.method.material_responsibility`)

### Phase 4: SOV auto-generation
Once scope is done and contract values are set, the SOV generates automatically using existing engine logic. User reviews and locks.

## Implementation

### New unified shell component
**`src/components/project-setup/ProjectSetupFlow.tsx`** — orchestrates all 4 phases with a persistent sidebar showing progress across all phases.

### Phase navigation
- Left sidebar shows all 4 phases with sub-steps
- User can jump back to any completed phase
- Phase 2 (scope) only unlocks after Phase 1c (building profile) is saved
- Phase 3 (contracts) only unlocks after Phase 2 is complete (scope_complete = true)
- Phase 4 (SOV) only unlocks after Phase 3 has at least one contract with a sum > 0

### Data flow connections
- Phase 1c building type → Phase 2 `buildingType` prop
- Phase 1b team members → Phase 3 contract counterparties
- Phase 3 material responsibility → Phase 2 `matResp` (bidirectional — if user set it in scope first, it pre-fills in contracts)
- Phase 2 scope answers + Phase 3 contract sum → Phase 4 SOV generation input

### Routing
- New projects: `/project/new` → unified flow (replaces `CreateProjectNew`)
- Existing projects in setup status: `/project/:id/setup` → resumes at the furthest incomplete phase
- Active projects: individual tabs remain for editing scope, contracts, SOV separately

### Files to create
- `src/components/project-setup/ProjectSetupFlow.tsx` — main shell with phase navigation
- `src/components/project-setup/PhaseBuilding.tsx` — combines basics + team + building profile
- `src/components/project-setup/PhaseContracts.tsx` — upstream/downstream contract setup
- `src/components/project-setup/PhaseSOV.tsx` — SOV generation review
- `src/components/project-setup/SetupSidebar.tsx` — persistent progress sidebar

### Files to modify
- `src/pages/ProjectHome.tsx` — for setup-status projects, render `ProjectSetupFlow` instead of tabs
- `src/components/framing-scope/FramingScopeWizard.tsx` — add `embedded` mode prop (hides its own header/nav when inside the unified flow, uses parent's navigation)
- `src/App.tsx` — add `/project/:id/setup` route
- Navigation components — "Setup" link for projects in setup status

### Files NOT changed
- All 11 framing scope section components — reused as-is
- Database tables — no schema changes needed
- Hooks (`useFramingScope`, `useProjectProfile`) — reused as-is
- SOV generation engine — reused as-is

## What stays separate
- For **active** projects (status != setup), the existing individual tabs (Scope, Contracts, SOV) remain for editing
- The unified flow is specifically for **project setup** — getting from zero to "ready to build"

