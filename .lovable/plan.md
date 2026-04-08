

# Project Setup Wizard v2 — Complete Rebuild

## What I Understand

Your current setup wizard asks **85+ questions** pulled from a `setup_questions` database table, organized into 5 generic phases (Project Identity, What You're Building, Exterior Envelope, Interior Rough, Terms & Scope). Most of those questions don't affect the SOV output — framers abandon it or answer randomly.

The new wizard you've designed asks **8–15 questions** depending on building type. Every question directly maps to SOV line items: it either adds a line, removes one, drives a loop (floors), or gates a branch of follow-up questions. The spreadsheet defines the exact question set for each of 6 building types, plus 3 shared questions.

The key shift: **the wizard IS the SOV builder**. As the user answers questions, a live SOV preview updates in real-time on the right side, showing the framer exactly what they're building toward — the billing document they'll use to get paid.

## Approach

### Phase 1: Archive the Old System

Move these files to `src/_archive/setup-v1/`:
- `src/components/setup-engine/SetupWizardShell.tsx`
- `src/components/setup-engine/DynamicSection.tsx`
- `src/components/setup-engine/QuestionField.tsx`
- `src/hooks/useSetupQuestions.ts`

The `setup_questions` database table stays untouched. The old framing scope wizard (`src/components/framing-scope/`) is unrelated and stays in place.

### Phase 2: Build the Question Engine (Data Layer)

Create `src/hooks/useSetupWizardV2.ts` — a purely client-side question engine. No database table for questions; the question definitions are hardcoded TypeScript matching the spreadsheet exactly.

**Core data structures:**
- `BUILDING_TYPES` — 6 types (Custom Home, Track Home, Townhome, Apartments/MF, Hotel, Senior Living)
- `SHARED_QUESTIONS` — 3 questions (material responsibility, mobilization, structural steel)
- `QUESTIONS_BY_TYPE` — per-type question arrays with fields: `id`, `phase`, `label`, `inputType`, `options`, `tag` (always/conditional/scope_gate/loop_driver), `conditionalOn`, `sovLinesGenerated`
- `SOV_PHASES` — 7-phase structure (Mobilization → Per-floor loop → Roof → Envelope → Backout → Exterior finish → Closeout)

**Question evaluation logic:**
- `getVisibleQuestions(type, answers)` — filters based on conditionalOn chains (e.g., Q10a only shows if Q10=Yes)
- `generateSOVLines(type, answers)` — the core function that takes all answers and produces the SOV line item array, applying the floor loop, scope gates, and conditional branches

**Answer storage:** Saves to `project_setup_answers` table using the existing upsert pattern (field_key + value), plus writes the generated SOV items to the project record.

### Phase 3: Build the Wizard UI

Create `src/components/setup-wizard-v2/SetupWizardV2.tsx` — the new split-screen wizard.

**Layout:**
- Desktop: left panel = questions, right panel = live SOV preview
- Mobile: tabbed view (Questions | SOV Preview)
- Top: progress bar showing current phase out of 7 (Structure → Roof → Envelope → Backout → Exterior → Closeout)

**Question components:**
- `BuildingTypeSelector` — card grid for the 6 types (first screen, always shown)
- `WizardQuestion` — renders a single question based on its inputType (Yes/No buttons, Dropdown, Number input, Yes/No + percentage, Yes/No + floor multi-select)
- Conditional questions animate in with CSS transitions when parent gate = Yes
- No → collapses children and removes SOV lines from preview instantly

**SOV Preview panel:**
- `SOVLivePreview` — grouped by the 7 phases, each line shows description + $0.00 placeholder
- Lines appear/disappear with animation as answers change
- Floor loop lines are labeled L1, L2, L3... based on story count
- Phase headers always visible; empty phases show "No items — answer questions to add"

### Phase 4: Wire Into the Existing Setup Flow

Update `src/components/project-setup/ProjectSetupFlow.tsx`:
- Replace `<SetupWizardShell>` import with `<SetupWizardV2>`
- Keep the same 3-card pipeline (Setup → Contracts → SOV)
- On wizard completion, save `scope_selections` JSON + generated `sov_items` array
- The generated SOV from the wizard becomes the seed data for the existing SOV generation engine

### Phase 5: SOV Line Generation Logic

The `generateSOVLines()` function follows the 7-phase template from the spreadsheet:

```text
Phase 1: Mobilization & Steel
  - Mobilization (if mobilization=yes) → 1 line
  - Structural steel per floor (if steel=yes) → N lines

Phase 2: Per-Floor Structural (repeats × stories)
  - Floor system — L[n]
  - Floor sheathing — L[n]
  - Wall framing — L[n]
  - Hardware & connectors — L[n]
  - Elevator hoistway — L[n] (if elevator=yes)
  - Stair tower framing — L[n] (if stairs > 0)
  - Garage framing (L1 only, if garage=yes)

Phase 3: Roof Structural
  - Roof framing (always)
  - Roof sheathing (if roof_sheathing=yes)

Phase 4: Exterior Envelope
  - WRB (always)
  - Windows & doors (if windows_in_scope=yes, description varies by install_mode)

Phase 5: Backout & Interior
  - MEP backout, blocking, fire blocking, shim & shave (always)
  - ADA blocking (Senior Living only)

Phase 6: Exterior Finish
  - Siding — 1 line or 4 elevation lines (if siding_in_scope=yes)
  - Fascia/soffit (always)
  - Trim (always)
  - Balcony/deck framing + decking finish (conditional chain)
  - Rooftop deck (conditional)
  - Decorative items (if decorative=yes)
  - Type-specific: porte-cochère, pool deck, breezeways, amenity buildings

Phase 7: Closeout
  - Frame walk, nail sweep, final punch (always)
```

## Files Changed

| File | Action |
|------|--------|
| `src/_archive/setup-v1/SetupWizardShell.tsx` | Move (archive) |
| `src/_archive/setup-v1/DynamicSection.tsx` | Move (archive) |
| `src/_archive/setup-v1/QuestionField.tsx` | Move (archive) |
| `src/_archive/setup-v1/useSetupQuestions.ts` | Move (archive) |
| `src/hooks/useSetupWizardV2.ts` | Create — question definitions, visibility logic, SOV generation |
| `src/components/setup-wizard-v2/SetupWizardV2.tsx` | Create — main split-screen wizard shell |
| `src/components/setup-wizard-v2/BuildingTypeSelector.tsx` | Create — 6-type card grid |
| `src/components/setup-wizard-v2/WizardQuestion.tsx` | Create — single question renderer with animation |
| `src/components/setup-wizard-v2/SOVLivePreview.tsx` | Create — real-time SOV preview panel |
| `src/components/setup-wizard-v2/WizardProgress.tsx` | Create — 7-phase progress indicator |
| `src/components/project-setup/ProjectSetupFlow.tsx` | Update — swap to V2 wizard |

No database migrations needed — answers still save to `project_setup_answers` with the existing upsert pattern.

