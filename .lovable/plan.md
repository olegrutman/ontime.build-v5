

# Framing Scope Wizard — Implementation Plan

## What This Does
Replaces the generic `ScopeDetailsTab` with a purpose-built **Framing Scope Wizard** for rough carpentry contractors. Three-panel layout (nav + questions + live summary), 11 sections, gated by material responsibility and building type. Generates a formatted Division 06100 scope document.

## Database

**New table**: `project_framing_scope`
```sql
create table public.project_framing_scope (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  answers jsonb not null default '{}',
  scope_complete boolean not null default false,
  current_section integer not null default 0,
  generated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id)
);
alter table public.project_framing_scope enable row level security;
```
RLS: authenticated users who are project participants can read/write.

## Architecture

### Types — `src/types/framingScope.ts`
- `MaterialResponsibility`: `'LABOR_ONLY' | 'FURNISH_INSTALL' | 'SPLIT'`
- `BuildingType`: `'SFR' | 'TOWNHOMES' | 'MULTI_FAMILY' | 'HOTEL' | 'COMMERCIAL'`
- `FramingScopeAnswers`: typed interface with all 11 sections as nested objects (method, structure, sheathing, exterior, siding, openings, blocking, fire, hardware, dryin, cleanup)
- `SectionDef`: `{ id, label, icon, isComplete(answers) }` for nav
- Visibility helpers: `showForBuilding(questionId, buildingType)`, `showForMatResp(questionId, matResp)`

### Hook — `src/hooks/useFramingScope.ts`
- Loads/saves `project_framing_scope` row via Supabase
- `answers` state as `FramingScopeAnswers` (local state, auto-saved on section advance)
- `setAnswer(path, value)` helper using dot-path updates into the JSON
- `markComplete()` sets `scope_complete = true` and `generated_at = now()`
- Derives `matResp` and `buildingType` from answers + project profile

### Reusable Question Components — `src/components/framing-scope/controls/`
- **YesNoRow** — label, subtitle, Yes/No/N-A pill buttons, answered highlight
- **ScopeRadioGroup** — single select with label + description per option, description callout support
- **ScopeCheckboxGroup** — multi-select grid (2-3 col)
- **BlockingTable** — IN/EX toggle per row with label column
- **ChildPanel** — indented expansion that appears when parent = Yes, collapses + grays when No/N-A
- **MaterialBanner** — sticky banner showing current matResp with Edit link

### Root Wizard — `src/components/framing-scope/FramingScopeWizard.tsx`
- Three-panel layout: left nav (200px) + center questions (max 680px) + right summary (240px)
- Left nav: section list with completion dots (green checkmark when complete)
- Center: renders active section component, passing `matResp`, `buildingType`, `answers`, `setAnswer`
- Right: `ScopeSummaryPanel` showing included/excluded items in real-time
- Mobile: left nav collapses to progress bar + "Section X of Y"; summary behind "Preview scope" bottom sheet
- Auto-saves on section navigation
- First-visit: "Start scope setup" landing screen
- Return visit (complete): shows `ScopeDocument` with "Edit scope" button

### Section Components — `src/components/framing-scope/sections/`
Each receives `{ matResp, buildingType, answers, setAnswer }` props.

| File | Section | Key Logic |
|------|---------|-----------|
| `MethodSection.tsx` | 1. Method & MatResp | Material responsibility radio (gates all), framing method, mobilization |
| `StructureSection.tsx` | 2. Building Features | Yes/No + child panels for stairs, elevator, corridors, balconies, garages — visibility per buildingType |
| `SheathingSection.tsx` | 3. Sheathing & WRB | Wall/roof sheathing, WRB type — matResp gates material choices vs install-only questions |
| `ExteriorSection.tsx` | 4. Fascia, Soffit & Trim | Rough framing + finished material radios, conditional on matResp |
| `SidingSection.tsx` | 5. Siding & Cladding | Multi-select siding types, elevation assignment table, trim, accessories |
| `OpeningsSection.tsx` | 6. Openings | GFCI/CFCI/RO-only radios for windows, doors, overhead; flashing sub-questions |
| `BlockingSection.tsx` | 7. Blocking & Backing | BlockingTable with residential vs commercial items per buildingType; back-out framing |
| `FireSection.tsx` | 8. Fire & Smoke | Fire blocking, draft stops, firestopping, demising walls — heavy buildingType gating |
| `HardwareSection.tsx` | 9. Hardware & Connectors | MatResp-aware questions for connectors, anchor bolts, fasteners |
| `DryinSection.tsx` | 10. Dry-in & Hoisting | Hoisting radio, temp protection toggles |
| `CleanupSection.tsx` | 11. Cleanup & Warranty | Daily cleanup, nail sweep, dumpster, frame walk, warranty |

### Summary Panel — `src/components/framing-scope/ScopeSummaryPanel.tsx`
- Reads `answers` and renders section-by-section list of included items (green) and excluded items (gray strikethrough)
- Updates live as user toggles answers
- Shows GFCI/CFCI badges where applicable

### Scope Document — `src/components/framing-scope/ScopeDocument.tsx`
- Title: "Division 06100 — Rough Carpentry Scope of Work"
- Project header from project data
- Numbered sections matching wizard, each item with INCLUDED/EXCLUDED/LABOR-ONLY badge
- GFCI/CFCI badges on furnished items
- Excluded items in bold-italic
- Boilerplate footer
- Action buttons: Export PDF, Copy to clipboard, Attach to contract

## Routing & Integration

**Modified files:**
- `src/pages/ProjectHome.tsx` — replace `ScopeDetailsTab` import/render with `FramingScopeWizard` at `activeTab === 'scope'`
- `src/components/project/ProjectIconRail.tsx` — rename label from "Scope & Details" to "Framing Scope"
- `src/components/project/ProjectBottomNav.tsx` — rename label from "Scope & Details" to "Framing Scope"

**No changes to App.tsx routes** — the scope tab is already rendered inline within `ProjectHome` at the `scope` route.

## Build Order
1. Database migration (table + RLS)
2. Types file (`framingScope.ts`)
3. Hook (`useFramingScope.ts`)
4. Reusable controls (YesNoRow, ScopeRadioGroup, ScopeCheckboxGroup, BlockingTable, ChildPanel, MaterialBanner)
5. Sections 1-2 (Method + Structure) — these gate everything
6. Summary panel
7. Sections 3-11
8. Scope document component
9. Wire into ProjectHome, update nav labels

## Design
- Navy `#0D1F3C` accents, amber `#F5A623` for attention items
- Barlow Condensed for section headings via `font-heading`
- IBM Plex Mono for scope document output
- `DT.cardWrapper` and `DT.sectionHeader` tokens throughout
- 3px left accent bars for status indicators
- `animate-fade-in` stagger on question rows

## Files Created (~18)
- `src/types/framingScope.ts`
- `src/hooks/useFramingScope.ts`
- `src/components/framing-scope/FramingScopeWizard.tsx`
- `src/components/framing-scope/ScopeSummaryPanel.tsx`
- `src/components/framing-scope/ScopeDocument.tsx`
- `src/components/framing-scope/controls/YesNoRow.tsx`
- `src/components/framing-scope/controls/ScopeRadioGroup.tsx`
- `src/components/framing-scope/controls/ScopeCheckboxGroup.tsx`
- `src/components/framing-scope/controls/BlockingTable.tsx`
- `src/components/framing-scope/controls/ChildPanel.tsx`
- `src/components/framing-scope/controls/MaterialBanner.tsx`
- `src/components/framing-scope/sections/MethodSection.tsx`
- `src/components/framing-scope/sections/StructureSection.tsx`
- `src/components/framing-scope/sections/SheathingSection.tsx`
- `src/components/framing-scope/sections/ExteriorSection.tsx`
- `src/components/framing-scope/sections/SidingSection.tsx`
- `src/components/framing-scope/sections/OpeningsSection.tsx`
- `src/components/framing-scope/sections/BlockingSection.tsx`
- `src/components/framing-scope/sections/FireSection.tsx`
- `src/components/framing-scope/sections/HardwareSection.tsx`
- `src/components/framing-scope/sections/DryinSection.tsx`
- `src/components/framing-scope/sections/CleanupSection.tsx`

## Files Modified (3)
- `src/pages/ProjectHome.tsx`
- `src/components/project/ProjectIconRail.tsx`
- `src/components/project/ProjectBottomNav.tsx`

## Not Changed
- Database hooks, edge functions, auth, other tabs — untouched
- Old `ScopeDetailsTab` kept in codebase but no longer rendered (safe cleanup later)
- Old wizard pages (`ProjectDetailsWizard`, `ProjectScopeWizard`) routes kept but unused

