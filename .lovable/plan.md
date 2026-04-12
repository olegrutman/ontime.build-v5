

# Add Building Info Step for T&M Projects

## What you're asking
Right now, when you pick "Remodel / T&M" during project creation, the wizard jumps straight from Contract Mode → Review. You want a lightweight "Building Info" step in between that captures key details the WO wizard needs later — but does NOT build an SOV.

## What gets captured
- **Material responsibility**: GC, TC, or Split
- **Building type**: Single Family, Townhome, Multifamily, etc. (reuse existing `PROJECT_TYPES` from `projectWizard.ts`)
- **Stories / floors**
- **Basement** (yes/no, type if yes)
- **Garage** (Attached / Detached / None)
- **Siding** (yes/no, materials if yes)
- **Foundation type** (Slab, Crawl Space, Basement)

This info is saved to the existing `project_scope_details` table — same table the fixed-price flow uses — so the WO wizard and `VisualLocationPicker` can read it for level options, exterior options, etc.

## Changes

### 1. New component: `src/components/project-wizard-new/TMBuildingInfoStep.tsx`
A single-panel form with:
- Material responsibility toggle (GC / TC / Split)
- Building type dropdown (from `PROJECT_TYPES`)
- Number of stories (number input)
- Foundation type (Slab / Crawl Space / Basement) with conditional basement sub-fields
- Garage type (Attached / Detached / None)
- Siding included (yes/no) → if yes, material multi-select chips
- Total sqft (optional)

No SOV preview, no dual-column layout — just a clean form card.

### 2. Update `src/pages/CreateProjectNew.tsx`
- Change `TM_STEPS` from `[basics, mode, review]` to `[basics, mode, building_info, review]`
- Add a `tmScope` state object for the building info fields
- Render `TMBuildingInfoStep` for the `building_info` step
- Validation: require at least material responsibility + building type + stories
- On `createProject()`: insert `tmScope` fields into `project_scope_details` after creating the project (currently skipped entirely for T&M)

### 3. Update `src/components/project-wizard-new/UnifiedReviewStep.tsx`
- Show the T&M building info summary in the review step (material responsibility, building type, stories, basement, garage, siding)

### 4. No database changes needed
The `project_scope_details` table already has all the columns: `home_type`, `floors`, `foundation_type`, `basement_type`, `has_shared_walls`, `siding_included`, `siding_materials`, `construction_type`, `num_buildings`, `stories`, plus the newer `total_sqft`, `garage_type` fields. Material responsibility can go on the project or contract record where it's already stored.

## What stays the same
- The fixed-price wizard flow — completely unchanged
- The WO wizard (`TMWOWizard.tsx`) — unchanged, it already reads from `project_scope_details` via `useProjectScope`
- No SOV generation for T&M projects
- Database schema — no migrations needed

