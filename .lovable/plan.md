

# Add Garage Car Count to Project Setup

## What
Add a "How many cars?" selector that appears when the user picks Attached or Detached garage, letting them specify 1-car, 2-car, 3-car, or 4-car garage capacity.

## Changes

### 1. Database Migration
Add `garage_car_count integer default null` to `project_profiles`.

### 2. Update Types (`src/types/projectProfile.ts`)
- Add `garage_car_count: number | null` to `ProjectProfile` and `ProfileDraft`
- Add `GARAGE_CAR_COUNT_OPTIONS = ['1', '2', '3', '4'] as const`
- Set `garage_car_count: 2` as default in `getSmartDefaults()` for types that default `has_garage: true`

### 3. Update Wizard Step (`src/pages/ProjectDetailsWizard.tsx`)
Below the existing Garage chip-select (None / Attached / Detached), conditionally render a second chip-select for car count when `has_garage` is true:
```
Garage:  [None] [Attached] [Detached]
Cars:    [1] [2] [3] [4]        ← only visible when garage selected
```
Reset `garage_car_count` to `null` when garage is set to "None".

### 4. Update Summary (`DetailsSummaryPanel.tsx`)
Show garage with car count, e.g. "Garage (Attached, 2-car)" instead of just "Garage".

### 5. Update Review step
Show car count in the review summary line for garage.

