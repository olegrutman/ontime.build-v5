

# Rebuild Project Setup Using Question Database as Single Source of Truth

## Summary

Replace the current hardcoded wizard sections and TypeScript constants with a **data-driven question engine** powered by the 109-question spreadsheet. Questions, options, and building-type visibility rules live in a single database table. The UI renders dynamically from that data — no more scattered constants across `framingScope.ts`, `projectWizard.ts`, and 13 section components.

## Current State

- **7 building types** in `project_types` table (missing Senior Living, Industrial; MF not split into 3-5/6+)
- **13 hardcoded section components** in `src/components/framing-scope/sections/` with ~240 lines of TypeScript types and visibility helpers in `framingScope.ts`
- **Phase 1 (Basics)** lives in `project-wizard-new/BasicsStep.tsx` with a different type system (`projectWizard.ts`)
- **Phase 5 (Contract & Scope)** partially exists in `PhaseContracts.tsx` but is missing billing period, lien waiver, prevailing wage, mobilization %, warranty, and scope description fields
- Options per building type are hardcoded as arrays/enums — changing them requires code changes

## Architecture

```text
┌─────────────────────────────────────┐
│  setup_questions (DB table)         │
│  109 rows from spreadsheet          │
│  phase, section, field_key,         │
│  input_type, trigger_condition,     │
│  options_by_building_type (JSONB)   │
└──────────────┬──────────────────────┘
               │ useSetupQuestions(phase, buildingType)
               ▼
┌─────────────────────────────────────┐
│  <DynamicSection />                 │
│  Renders questions from DB rows     │
│  Handles: Text, Dropdown, Number,   │
│  Yes/No, Multi-Select, Date,        │
│  Currency, Percentage, Textarea,    │
│  Toggle, Address, Lookup            │
└──────────────┬──────────────────────┘
               │ saves to
               ▼
┌─────────────────────────────────────┐
│  project_setup_answers (DB table)   │
│  project_id, field_key, value       │
│  (JSONB — supports all types)       │
└─────────────────────────────────────┘
```

## Database Changes

### 1. Update `project_types` table

Add 3 new rows, update 2 existing:
- **Add**: `Senior Living` (slug: `senior_living`), `Industrial` (slug: `industrial`), `Multifamily 6+` (slug: `mf_6plus`)
- **Rename**: `Apartment / Condo` → `Multifamily 3-5` (slug: `mf_3to5`)

### 2. New table: `setup_questions`

```sql
CREATE TABLE setup_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase integer NOT NULL,          -- 1-5
  phase_name text NOT NULL,        -- "Project Identity", etc.
  section text NOT NULL,           -- "Project Basics", "Building Profile", etc.
  sort_order integer NOT NULL,     -- row order within phase+section
  label text NOT NULL,             -- "Project Name", "IBC Construction Type"
  field_key text NOT NULL UNIQUE,  -- "name", "building_type_code"
  input_type text NOT NULL,        -- text, dropdown, number, yes_no, multi_select, date, currency, percentage, textarea, toggle, address, lookup
  trigger_condition text,          -- null = always show, "wood_stairs=yes", etc.
  options_by_type jsonb NOT NULL DEFAULT '{}',
  -- { "mf_3to5": ["Type III-A","Type III-B",...], "sfr": ["Type V-A","Type V-B"], ... }
  -- "N/A" or missing key = hidden for that type
  notes text,
  created_at timestamptz DEFAULT now()
);
```

### 3. New table: `project_setup_answers`

```sql
CREATE TABLE project_setup_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  field_key text NOT NULL,
  value jsonb NOT NULL DEFAULT 'null',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, field_key)
);
```

RLS: authenticated users in `project_participants` can SELECT/INSERT/UPDATE.

### 4. Seed `setup_questions` with all 109 rows from the spreadsheet

Import script parses each row into the correct `options_by_type` JSONB structure, mapping column headers to building type slugs.

## Frontend Changes

### Phase 1 — Data hooks and renderer

**New files:**
| File | Purpose |
|------|---------|
| `src/hooks/useSetupQuestions.ts` | Fetch questions filtered by phase/section; fetch+save answers |
| `src/components/setup-engine/DynamicSection.tsx` | Renders a list of questions using correct input components |
| `src/components/setup-engine/QuestionField.tsx` | Single question renderer — switches on `input_type` to render Input, Select, MultiSelect, YesNo toggle, DatePicker, CurrencyInput, etc. |
| `src/components/setup-engine/SetupWizardShell.tsx` | Phase/section navigation shell with sidebar and progress |

**`useSetupQuestions` hook logic:**
1. Fetch all `setup_questions` rows for a given phase
2. Group by `section`
3. Filter options by current building type slug (from answers)
4. Evaluate `trigger_condition` against current answers to show/hide conditional fields
5. Provide `saveAnswer(field_key, value)` that upserts into `project_setup_answers`

**`QuestionField` component — input type map:**
| `input_type` | Component |
|--------------|-----------|
| `text` | `<Input />` |
| `textarea` | `<Textarea />` |
| `dropdown` | `<Select />` with options from `options_by_type[buildingType]` |
| `multi_select` | Checkbox group |
| `yes_no` | Two-button toggle (Yes/No) |
| `number` | `<Input type="number" />` |
| `date` | Date picker |
| `currency` | Dollar-prefixed input |
| `percentage` | Percent-suffixed input |
| `toggle` | `<Switch />` |
| `address` | Address fields group (street, city, state, zip) |
| `lookup` | Organization search component |

### Phase 2 — Rewire the setup flow

**`ProjectSetupFlow.tsx`** — Replace the 4-step pipeline with 5 phases matching the spreadsheet:

| Step | Phase | Sections |
|------|-------|----------|
| 1 | Project Identity | Project Basics |
| 2 | What You're Building | Building Profile, Structural System, Structural Features, Structural Steel |
| 3 | Exterior Envelope | Roof, Wall Sheathing, Waterproofing & WRB, Cladding & Siding, Trim & Fascia, Openings, Decks & Outdoor |
| 4 | Interior Rough | Fire & Life Safety, Blocking & Backout |
| 5 | Contract & Scope | Contract Terms, Mobilization, Materials, Warranty & Closeout |

Each phase uses `<DynamicSection />` instead of dedicated section components.

### Phase 3 — Migrate existing data

- Map existing `project_profiles` columns → `project_setup_answers` rows
- Map existing `project_framing_scope.answers` JSONB → `project_setup_answers` rows
- Keep old tables readable during transition; new wizard writes only to `project_setup_answers`

### Phase 4 — Remove legacy code

After migration is verified:
- Delete 13 section components in `src/components/framing-scope/sections/`
- Delete `src/types/framingScope.ts` (241 lines of hardcoded types)
- Delete `src/types/projectWizard.ts` (redundant type definitions)
- Remove `FramingScopeWizard.tsx`, `ScopeSummaryPanel.tsx`, `ScopeDocument.tsx`
- Simplify `PhaseContracts.tsx` — contract sum/retainage now come from Phase 5 answers

## Files Summary

| Action | Files |
|--------|-------|
| **New** | `setup_questions` migration, `project_setup_answers` migration, `useSetupQuestions.ts`, `DynamicSection.tsx`, `QuestionField.tsx`, `SetupWizardShell.tsx`, seed script for 109 questions |
| **Modified** | `ProjectSetupFlow.tsx` (rewired to 5 phases), `PhaseContracts.tsx` (reads from answers), `PhaseSOV.tsx` (reads from answers), `ProjectInfoCard.tsx` (uses Phase 1 answers) |
| **Deleted** | 13 section components, `FramingScopeWizard.tsx`, `ScopeSummaryPanel.tsx`, `ScopeDocument.tsx`, `framingScope.ts`, `projectWizard.ts` |

## What is NOT changing

- Project creation wizard (3-step: basics, team, review) — stays as-is for quick project creation
- Sidebar, header, navigation
- Dashboard, overview, PO/CO/invoice pages
- RLS policies on existing tables
- SOV and contract activation logic (just rewired to read from `project_setup_answers`)

