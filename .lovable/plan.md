

# Redesign: Project Setup + Contract Scope Separation

This is a large architectural change that separates "what the building IS" from "what this company is RESPONSIBLE for." I recommend phasing this into two parts to keep it manageable and testable.

---

## Phase 1 — Redesign Project Setup (Building Definition Only)

### Database Migration

**Add new columns to `project_profiles`:**
- `framing_system` text (Stick Frame / Pre-Fabricated Walls)
- `floor_system` text (TJI / Floor Trusses)
- `roof_system` text (Stick Frame Roof / Pre-Manufactured Trusses / Flat Roof System)
- `structure_type` text (Wood Frame / Steel / Mixed) — for hotel/commercial
- `has_corridors` boolean, `corridor_type` text (Interior / Exterior / None)
- `has_balcony` boolean
- `has_deck` boolean, `has_covered_porch` boolean
- `deck_porch_type` text (None / Deck / Covered Porch / Both)
- `entry_type` text (Standard / Open Entry / Covered Entry)
- `special_rooms` text[] (Mechanical Room, Boiler Room, Elevator Shaft)
- `stories_per_unit` int — for townhomes

**Add new project type:**
- Insert `('Hotel', 'hotel', false, false, true, 5, NULL, 1)` into `project_types`

### Rewrite `ProjectDetailsWizard.tsx` — 3 Steps Only

**Step 1 — Select Project Type** (6 options as specified)
- Single Family Home, Custom Home, Townhomes/Duplex, Apartments/Condos, Hotel, Commercial/Mixed Use

**Step 2 — Building Structure** (dynamic per type)
- **Single Family / Custom Home**: Floors, Foundation, Framing System, Floor System, Roof System, Garage, Deck/Porch, Balcony, Entry Type, Special Rooms
- **Multi-Family (Apartments/Townhomes)**: Buildings, Units, Stories per building, Stories per unit (townhomes), Framing Type, Floor System, Roof System, Corridors, Elevator, Balconies
- **Hotel / Commercial**: Buildings, Floors, Structure Type, Floor System, Roof Type, Elevator

All inputs are dropdowns, toggles, or chip-selects — no free text except "Other."

**Step 3 — Save Project**
- Summary card showing all selections
- Save button → project becomes active, NO scope questions asked here

### Update Types & Defaults
- Update `ProfileDraft` in `projectProfile.ts` with new fields
- Update `getSmartDefaults()` with construction-accurate defaults per type
- Update `DetailsSummaryPanel` to show new fields (framing, floor system, etc.)

### Files Changed
- `supabase/migrations/` — new migration for columns + Hotel type
- `src/types/projectProfile.ts` — new fields, new option constants
- `src/pages/ProjectDetailsWizard.tsx` — rewrite steps 0-4 → steps 0-2
- `src/components/project-wizard-new/DetailsSummaryPanel.tsx` — add new fields

---

## Phase 2 — New Contract Scope Wizard

### Database: New Tables

**`contract_scope_categories`** (seed table)
- id, slug, label, display_order
- Seeds: framing, sheathing, wrb, windows, exterior_doors, siding, exterior_trim, soffit_fascia, decks_railings, garage_framing, interior_blocking, stairs, other

**`contract_scope_selections`**
- id, project_id, contract_id (FK to project_contracts), category_slug, is_included (bool)
- Tracks which categories are in/out for a specific contract

**`contract_scope_details`**
- id, selection_id (FK), detail_key text, detail_value text
- Stores per-category details (e.g., key="wrb_type", value="Tyvek")

**`contract_scope_exclusions`**
- id, project_id, contract_id, exclusion_label text, is_custom boolean

### New Page: `ContractScopeWizard.tsx`

Route: `/project/:id/contract/:contractId/scope`

**Step 1 — Select Scope Categories**: Checklist of 13 categories with toggles

**Step 2 — Detailed Scope** (per selected category): Dynamic sub-questions rendered as dropdowns/toggles:
- Framing → Wall System, Floor System, Roof System
- WRB → Type (Tyvek / ZIP / Other)
- Windows → Window Type, Trim Around Windows + type
- Siding → Type, Scope Level (Full/Partial)
- Soffit & Fascia → Fascia Type, Soffit Type
- Decks → Type, Railings
- etc.

Each category rendered as a collapsible card. Max 5-7 questions per screen.

**Step 3 — Exclusions**: Multi-select of common exclusions (Cabinets, Fixtures, Electrical, Plumbing, Drywall, Paint, Flooring) + "Other" free text

**Step 4 — Scope Summary**: Auto-generated plain-English summary of all selections, stored and displayable on the contract detail page

### Files Created
- `supabase/migrations/` — contract scope tables + seeds + RLS
- `src/pages/ContractScopeWizard.tsx` — 4-step wizard
- `src/components/contract-scope/CategoryStep.tsx`
- `src/components/contract-scope/DetailStep.tsx`
- `src/components/contract-scope/ExclusionStep.tsx`
- `src/components/contract-scope/ScopeSummary.tsx`
- `src/hooks/useContractScope.ts` — CRUD hooks
- `src/types/contractScope.ts` — types + category config

### Integration Points
- Link from `ProjectContractsPage` → "Define Scope" button per contract
- Scope summary visible on contract detail views
- Different companies can have different scopes on the same project

---

## UX Rules (Applied Throughout)
- Max 5-7 questions per screen
- All inputs are dropdowns, toggles, or chip-selects
- No typing unless "Other"
- Dynamic logic only — irrelevant fields hidden
- Mobile-first layout with collapsible sections
- Running summary sidebar on desktop

---

## Recommended Approach

Due to the size, I recommend implementing **Phase 1 first** (project setup redesign), testing it, then proceeding to **Phase 2** (contract scope wizard). Shall I proceed with Phase 1?

