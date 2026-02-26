

# Improve Project Scope Questionnaire and Auto-Generate Description

## What This Does (Plain English)

Right now, when you create a project, the wizard asks about framing details (roof type, siding, etc.) but misses basic sizing info that every contractor needs upfront -- like how big the house is. Also, the project description only gets generated later, after you've already left the wizard. 

This plan adds a few key missing questions to the Scope step and then automatically generates a short, professional project description at the end of the wizard -- so when your team opens the project, they immediately know what they're walking into.

## New Questions Being Added

These are standard data points that GCs and estimators use on every bid sheet:

1. **Total Square Footage** -- The living/conditioned area. This is the single most important sizing metric in residential construction.
2. **Lot Size (acres)** -- Gives context for site access and grading.
3. **Number of Bedrooms / Bathrooms** -- Quick shorthand for project complexity.
4. **Garage** -- Attached, Detached, or None. If attached, how many cars (1, 2, 3+).
5. **Framing Method** -- Stick Frame, Panelized, or Hybrid. Already exists in the old wizard but is missing from the new one.

These fields are all optional (like everything else on the Scope step) so they won't block project creation.

## Auto-Generated Description

After the scope is saved and the user lands on the Review step, the system calls the existing AI edge function (`generate-scope-description`) in the background. The Review step shows the generated description with a loading spinner while it's working. The description reads like a short bid summary, for example:

> "3,200 SF custom home, 2 stories on slab foundation with hip roof. Attached 3-car garage. Stick-framed with fiber cement siding, covered porches, and field-built stairs. Scope includes windows, WRB, and exterior doors."

The user can regenerate it from the Review step if they want.

---

## Technical Details

### 1. Database Migration

Add new columns to `project_scope_details`:

```sql
ALTER TABLE public.project_scope_details
  ADD COLUMN IF NOT EXISTS total_sqft integer,
  ADD COLUMN IF NOT EXISTS lot_size_acres numeric(6,2),
  ADD COLUMN IF NOT EXISTS bedrooms integer,
  ADD COLUMN IF NOT EXISTS bathrooms numeric(3,1),
  ADD COLUMN IF NOT EXISTS garage_type text,
  ADD COLUMN IF NOT EXISTS garage_cars integer,
  ADD COLUMN IF NOT EXISTS framing_method text;
```

### 2. Update `src/types/projectWizard.ts`

Add to `ScopeDetails` interface:
- `totalSqft?: number`
- `lotSizeAcres?: number`
- `bedrooms?: number`
- `bathrooms?: number`
- `garageType?: 'Attached' | 'Detached' | 'None'`
- `garageCars?: number`
- `framingMethod?: 'Stick Frame' | 'Panelized' | 'Hybrid'`

Add new constants: `GARAGE_TYPES`, `FRAMING_METHODS`.

### 3. Update `src/components/project-wizard-new/ScopeStep.tsx`

Add a new "Project Size" card at the top (before Structure Details) with:
- Total Sq Ft (number input)
- Lot Size in Acres (number input)
- Bedrooms (select 1-6+)
- Bathrooms (select 1-6+)

Add a "Garage" card:
- Garage Type toggle (Attached / Detached / None)
- If not None: Number of Cars (1, 2, 3+)

Add a "Framing Method" card (for single family, townhome, duplex):
- Stick Frame / Panelized / Hybrid select

### 4. Update `src/pages/CreateProjectNew.tsx`

In `saveScope()`, include the new fields in the upsert payload.

When moving from step 2 (Scope) to step 3 (Contracts), after saving scope, fire the `generate-scope-description` edge function in the background (non-blocking).

### 5. Update `src/components/project-wizard-new/ReviewStep.tsx`

- Show a "Project Description" card at the top of the review
- Display the AI-generated description (fetched from `project_scope_details.scope_description`)
- Show a loading skeleton while it's being generated
- Add a "Regenerate" button

### 6. Update `supabase/functions/generate-scope-description/index.ts`

Add the new fields to the prompt context:
- Total sqft, lot size, bedrooms, bathrooms
- Garage type and size
- Framing method

Use model `google/gemini-2.5-flash` instead of `gemini-3-flash-preview` (the preview model has been returning 503 errors).

