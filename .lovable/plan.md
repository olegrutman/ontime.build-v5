

# Fix: Location Picker Not Reflecting Project Data

## Problem
The smart location picker code is deployed and working, but the project's `project_scope_details` row has `bedrooms: null` and `bathrooms: null`. When these are null, the expansion logic falls back to generic "Bedroom" / "Bathroom" — identical to the old behavior. The user sees no difference.

## Root Cause
The project setup wizard collects structural info (foundation, garage, siding) but never populates `bedrooms` or `bathrooms` counts into `project_scope_details`. These fields exist in the DB but are never written.

## Changes

### 1. Fallback defaults when counts are null — `src/hooks/useProjectScope.ts`
- In `expandBedrooms()`: when `scope.bedrooms` is null, default to **3** for custom homes and **2** for others (typical residential). This ensures the picker always shows numbered bedrooms.
- In `expandBathrooms()`: when `scope.bathrooms` is null, default to **2** for custom homes, **1** for others.
- Update `garageOption()`: currently checks `garage_type !== 'garage'` for the label — fix to show "Garage (Attached)" / "Garage (Detached)" based on actual value (the test project has `garage_type: 'Attached'` so it should show that).

### 2. Populate bedrooms/bathrooms in project setup — `src/hooks/useSetupWizardV2.ts` (or equivalent setup hook)
- When saving scope details, include the bedroom and bathroom counts from the wizard questions so future projects have real data.
- Find where `project_scope_details` is inserted/updated and ensure `bedrooms` and `bathrooms` fields are included.

### 3. Add missing rooms for ground floor — `src/hooks/useProjectScope.ts`
- Ground floor currently missing: **Hallway**, **Office/Study**, **Powder Room** (common in custom homes).
- Add Hallway and Office for custom homes on ground/upper floors.

## Technical Details

**Fallback logic in `expandBedrooms`:**
```text
count = scope.bedrooms ?? (isCustomHome ? 3 : 2)
```

**Fallback logic in `expandBathrooms`:**
```text
count = scope.bathrooms ?? (isCustomHome ? 2.5 : 1)
→ Bathroom 1, Bathroom 2, Half Bath
```

**Garage label fix:**
```text
"Attached" → "Garage (Attached)"
"Detached" → "Garage (Detached)"  
"basement" → "Garage (Basement)"
```

**No changes to**: submission logic, tag assembly, RFI location, database schema, exterior options.

