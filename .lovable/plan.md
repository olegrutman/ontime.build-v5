

# Redesign: Project Setup Scope + Contract Scope Separation

## Understanding

You want two layers of scope:

1. **Project Setup Scope** (added to the existing Project Details Wizard as a new step) — "What does this job involve?" Questions like:
   - Are you installing windows & patio doors?
   - Is siding included? What type?
   - Exterior trim? Type?
   - Backout plan included?
   - Soffit & fascia?
   - Extras: columns, corbels, specialty trim?
   
   These are **project-level base scope** questions — they define what the SOV will be built from. They're asked once per project, not per contract.

2. **Contract Scope** (extended version during contract creation) — confirms the base scope and adds contract-specific extras, modifications, and pricing. This is where you'd break it down further per company.

The key: **Project Setup scope drives SOV generation**. Contract scope refines it per company.

## Plan

### 1. Add new columns to `project_profiles` for base scope

New boolean + text fields:
- `scope_windows_install` boolean (installing windows?)
- `scope_windows_type` text (Vinyl / Wood / Aluminum / Mixed)
- `scope_patio_doors` boolean
- `scope_patio_door_type` text (Sliding / French / Standard Exterior)
- `scope_siding` boolean
- `scope_siding_type` text (Vinyl / Hardie / Wood / Metal / Mixed)
- `scope_siding_level` text (Full / Partial)
- `scope_exterior_trim` boolean
- `scope_exterior_trim_type` text (Wood / PVC / Composite)
- `scope_soffit_fascia` boolean
- `scope_fascia_type` text
- `scope_soffit_type` text
- `scope_backout` boolean
- `scope_decks_railings` boolean
- `scope_deck_type` text
- `scope_railings` boolean
- `scope_garage_framing` boolean
- `scope_garage_trim_openings` boolean
- `scope_wrb` boolean
- `scope_wrb_type` text
- `scope_sheathing` boolean
- `scope_extras` text[] (Columns, Corbels, Custom Headers, Specialty Blocking, etc.)

### 2. Add Step 2 to ProjectDetailsWizard: "What's Included?"

After Building Structure (step 1), add a new step with project-type-aware questions:

**All project types get:**
- Windows & Patio Doors (toggle + type selects)
- Siding (toggle + type + level)
- Exterior Trim (toggle + type)
- Soffit & Fascia (toggle + types)
- Backout Plan (toggle)
- WRB / Sheathing (toggle + type)

**Single Family / Custom Home also get:**
- Decks & Railings (toggle + type)
- Garage Framing (toggle + trim around openings)
- Extras: Columns, Corbels, Custom Headers, Specialty Blocking (multi-select chips)

**Multi-Family also gets:**
- Interior Blocking
- Stairs scope
- Fire stopping details

**Hotel/Commercial skips:**
- Corbels, columns (not typical)
- Adds: curtain wall, storefront framing

Each question group is a collapsible `FieldSection`. Max 5-7 visible at a time. All dropdowns/toggles, no typing.

### 3. Update Review step (now Step 3) to show scope summary

Add a "Scope Summary" section to the review card showing:
- "Windows: Installing — Vinyl"
- "Siding: Hardie (Full)"
- "Backout: Included"
- etc.

### 4. Update `DetailsSummaryPanel` sidebar

Add a "Scope" section below the building structure showing toggled-on items.

### 5. Update `WIZARD_STEPS` constant

Change from `['Type', 'Structure', 'Review']` to `['Type', 'Structure', 'Scope', 'Review']` (4 steps).

### 6. Keep Contract Scope Wizard as the "extended" version

The existing `ContractScopeWizard` stays but will pre-populate from the project-level scope when entering. This will be addressed in a follow-up — no changes to it now.

### Files Changed
- `supabase/migrations/` — add ~20 scope columns to `project_profiles`
- `src/types/projectProfile.ts` — new fields, new option constants (SIDING_TYPE_OPTIONS, WINDOW_TYPE_OPTIONS, EXTRAS_OPTIONS, etc.)
- `src/pages/ProjectDetailsWizard.tsx` — add Step 2 (scope), shift Review to Step 3, update WIZARD_STEPS
- `src/components/project-wizard-new/DetailsSummaryPanel.tsx` — add scope section

