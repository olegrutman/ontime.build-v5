

# RFI Wizard: Location Picker + Guided Question Templates

## Overview

Replace the current single-form `CreateRFIDialog` with a multi-step wizard (matching the Work Order wizard pattern). The wizard guides users through location selection first, then lets them pick from common RFI question templates (organized by category) so they answer structured prompts instead of typing free-form text. A final review step assembles the subject and question automatically.

## Step-by-Step Wizard Flow

```text
Step 1: Location       - Inside/Outside toggle, Level, Room/Area (reuses Work Order LocationStep pattern)
Step 2: RFI Category   - Pick a category: Dimensions, Product/Material, Design Clarification, Structural, MEP Coordination, General
Step 3: Question Builder - Based on category, answer structured prompts (dropdowns, inputs) that auto-build the question
Step 4: Routing         - Assign To org, Priority, Due Date
Step 5: Review          - Auto-generated subject + question text, edit if needed, submit
```

## RFI Question Templates (TC asking GC)

### Category: Dimensions
- What is the required height? (input: height value + unit)
- What is the required width? (input: width value + unit)  
- What are the overall dimensions? (inputs: length, width, height + unit)
- What is the on-center spacing? (input: spacing value)
- What is the rough opening size? (inputs: width x height)

### Category: Product / Material
- What product should be used? (input: product name, brand, model)
- What size/grade of lumber? (select from common sizes + grade)
- What type of fastener/hardware? (input: type, size, finish)
- What finish or color is specified? (input: finish/color name)
- What material thickness is required? (input: thickness + unit)

### Category: Design Clarification
- Is this detail per the plans? (input: drawing reference, description of conflict)
- Which drawing/detail governs? (input: drawing numbers in question)
- Is blocking/backing required here? (input: location description)
- What is the specified fire rating? (input: assembly description)

### Category: Structural
- What is the required bearing point? (input: location, load description)
- Is a beam/header required? (inputs: span, location)
- What is the joist/rafter size and spacing? (inputs: size, spacing)
- Is a post base or connector required? (input: location, load)

### Category: MEP Coordination
- Can we penetrate this member? (input: member description, hole size)
- Where should the rough-in be located? (input: fixture type, area)
- Is fire-stopping required at this penetration? (input: location)

### Category: General
- Free-form question (falls back to current textarea behavior)

## Technical Changes

### New/Modified Files

**1. `src/types/rfi.ts`** -- Add types
- `RFICategory` type (union of category strings)
- `RFIQuestionTemplate` interface (category, label, prompts array)
- `RFIWizardData` interface (location, category, template answers, routing, generated subject/question)
- `RFI_CATEGORIES` constant array
- `RFI_QUESTION_TEMPLATES` constant with all templates per category
- Add `location_data` to `CreateRFIPayload`

**2. `src/components/rfi/CreateRFIDialog.tsx`** -- Rewrite as wizard
- Replace single form with 5-step wizard matching Work Order wizard pattern
- Step 1: Location (reuse same Inside/Outside + Level + Room pattern from `work-order-wizard/steps/LocationStep.tsx`)
- Step 2: Category grid (6 category cards with icons)
- Step 3: Question builder (dynamic form based on selected template)
- Step 4: Routing (assign to, priority, due date -- moved from current form)
- Step 5: Review (auto-assembled subject + question, editable, submit)
- Footer with Back/Next/Submit buttons and step progress

**3. `src/components/rfi/wizard/RFILocationStep.tsx`** -- New file
- Location picker reusing the same pattern as Work Order LocationStep
- Inside/Outside toggle, Level select (from project scope), Room/Area select
- Uses `useProjectScope` hook for dynamic options

**4. `src/components/rfi/wizard/RFICategoryStep.tsx`** -- New file
- Grid of 6 category cards with icons (Ruler, Package, FileQuestion, Building, Wrench, MessageSquare)
- Each card shows category name + short description
- Selecting a category shows its available question templates as a list

**5. `src/components/rfi/wizard/RFIQuestionStep.tsx`** -- New file
- Renders dynamic form fields based on the selected template's prompts
- Each prompt is either an input, select, or textarea
- Answers are stored in wizard state and used to generate the final question text

**6. `src/components/rfi/wizard/RFIRoutingStep.tsx`** -- New file
- Assign To org selector, Priority selector, Due Date picker
- Extracted from current CreateRFIDialog form

**7. `src/components/rfi/wizard/RFIReviewStep.tsx`** -- New file
- Shows auto-generated subject (from location + category + template)
- Shows auto-generated question (assembled from template answers)
- Both fields are editable textareas so user can refine
- Location summary display

**8. Database migration** -- Add `location_data` column
- `ALTER TABLE project_rfis ADD COLUMN location_data jsonb DEFAULT '{}'::jsonb;`
- Stores the location selection (same structure as work orders)

### Auto-Generated Subject and Question Examples

Given: Location = "Inside, Floor 2, Kitchen" + Template = "What is the rough opening size?"
- **Subject**: "Floor 2 Kitchen - Rough Opening Size"
- **Question**: "At Floor 2, Kitchen (Inside): What is the rough opening size? Width: 36\", Height: 80\""

Given: Location = "Outside, Balcony North" + Template = "What product should be used?"
- **Subject**: "Balcony North - Product Specification"  
- **Question**: "At Balcony North (Outside): What product should be used? Product: TBD, Brand: TBD"

### No Other Files Changed

The `RFIsTab.tsx`, `RFIDetailDialog.tsx`, hooks, and routing remain unchanged. The wizard is self-contained within `CreateRFIDialog` and its sub-steps.

