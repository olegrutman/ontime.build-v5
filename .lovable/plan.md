

# Add Scope Detail Dropdowns for Better AI Descriptions

## Goal
Add a new "Scope Details" step to the Work Order wizard (between Work Type and Pricing) with dropdown-only questions that give the AI enough structured context to generate precise, actionable descriptions.

## New Dropdowns (all optional, all using Select pickers)

### 1. Structural Element
What is being worked on?
- Wall, Header, Beam, Joist, Rafter, Truss, Post/Column, Sill Plate, Top Plate, Stud, Blocking, Sheathing, Subfloor, Stairway, Other

### 2. Scope Size
How much work is involved?
- Single Item, Partial Wall/Section, Full Wall, Multiple Walls, Entire Room, Entire Floor, Other

### 3. Urgency
How urgent is this work?
- Standard, Priority, Urgent, Emergency

### 4. Access Conditions
Any special access needed?
- Clear Access, Scaffold Required, Lift Required, Ladder Only, Confined Space, Other

### 5. Existing Conditions
What is the current state?
- New Construction, Partially Complete, Needs Demo First, Damaged/Compromised, Standing but Incorrect, Other

## Technical Changes

### 1. Update types (`src/types/workOrderWizard.ts`)
- Add new fields to `WorkOrderWizardData`: `structural_element`, `scope_size`, `urgency`, `access_conditions`, `existing_conditions`
- Add option arrays for each field (e.g., `STRUCTURAL_ELEMENT_OPTIONS`, `SCOPE_SIZE_OPTIONS`, etc.)
- Update `INITIAL_WIZARD_DATA` with empty defaults

### 2. Create new step (`src/components/work-order-wizard/steps/ScopeDetailsStep.tsx`)
- New component with 5 `Select` dropdowns, each with a label and icon
- All fields optional so the user can skip through quickly
- Clean layout matching the existing wizard step style

### 3. Update wizard flow (`src/components/work-order-wizard/WorkOrderWizard.tsx`)
- Insert "Scope Details" as step 4 (between Work Type and Pricing)
- Update `STEPS` array (now 8 steps total)
- Import and render `ScopeDetailsStep`
- Shift step numbers for Pricing, Resources, Assignment, Review

### 4. Update AI prompt (`supabase/functions/generate-work-order-description/index.ts`)
- Accept new fields in the request body
- Add them to the context sent to the AI (e.g., "Structural Element: Header", "Scope Size: Partial Wall")
- This gives the AI much richer context for precise descriptions

### 5. Update Review step (`src/components/work-order-wizard/steps/ReviewStep.tsx`)
- Pass the new fields to the edge function call
- Show the new details in the summary section

## Result
The AI will receive structured data like "Re-frame a Header on Floor 2, Kitchen, Partial Wall scope, needs demo first, scaffold required, priority urgency" and generate a much more precise description than the current generic output.
