

# Redesign: Project Setup Scope + Contract Scope Separation

## Status: ✅ Implemented

## What Was Done

### 1. Database Migration
Added 27 scope columns to `project_profiles`: booleans for each scope area (windows, siding, trim, WRB, etc.) plus text fields for types/subtypes and a text[] for extras.

### 2. Updated Types (`src/types/projectProfile.ts`)
- Added all scope fields to `ProjectProfile` interface
- Added option constants: `WINDOW_TYPE_OPTIONS`, `SIDING_TYPE_OPTIONS`, `EXTERIOR_TRIM_TYPE_OPTIONS`, `WRB_TYPE_OPTIONS`, `SCOPE_EXTRAS_OPTIONS`, etc.
- Updated `WIZARD_STEPS` to 4 steps: Type → Structure → Scope → Review
- Updated `getSmartDefaults()` with scope defaults per project type

### 3. New Wizard Step: "What's Included?"
Project-type-aware scope questions in `ProjectDetailsWizard.tsx`:
- **All types**: Windows, Patio Doors, Siding (type + level), Exterior Trim, Soffit/Fascia, WRB, Sheathing, Backout
- **Single Family**: Decks & Railings, Garage Framing
- **Multi-Family**: Interior Blocking, Fire Stopping, Stairs Scope
- **Hotel/Commercial**: Curtain Wall, Storefront Framing
- **Extras**: Columns, Corbels, Custom Headers, Specialty Blocking (chips)

### 4. Updated Review Step
Shows "Scope Summary" card with all selected scope items as badges.

### 5. Updated Summary Panel
Added scope section with ClipboardList icon showing included items.

## Next Steps
- Contract Scope Wizard will pre-populate from project-level scope (follow-up)
- SOV generation will consume these scope fields
