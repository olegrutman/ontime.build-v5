

# Use V2 Building Type Tiles in TMBuildingInfoStep

## What changes
Replace the dropdown `<Select>` for building type in `TMBuildingInfoStep` with the same visual tile grid used in the V2 setup wizard (screenshot — Custom Home, Track Home, Townhome, Apartments/MF, Hotel/Hospitality, Senior Living).

## File: `src/components/project-wizard-new/TMBuildingInfoStep.tsx`

### 1. Import the building type data
- Import `BUILDING_TYPES` and `BuildingType` from `@/hooks/useSetupWizardV2`
- Import `cn` from `@/lib/utils`

### 2. Replace the dropdown with a tile grid
- Remove the `<Select>` for building type (lines 89-101)
- Replace with a 3-column grid of clickable tile buttons matching the `BuildingTypeSelector` pattern — each tile shows an emoji icon, label, and description
- Selected tile gets `border-primary bg-primary/10` styling

### 3. Update the data type
- Change `buildingType: string` to use the `BuildingType` slug values (`custom_home`, `track_home`, etc.) instead of the old `PROJECT_TYPES` strings
- Remove the `PROJECT_TYPES` import (no longer needed)

### 4. Update validation in `CreateProjectNew.tsx`
- The `canAdvance` check for `building_info` already checks `tmScope.buildingType` — no change needed since it's still a truthy string check

### 5. Update persistence mapping in `CreateProjectNew.tsx`
- The `home_type` field saved to `project_scope_details` will now store the slug (e.g., `custom_home`) instead of `Single Family` — functionally equivalent, just a different label set

## What stays the same
- Material responsibility, stories, foundation, garage, siding — all unchanged
- The tile layout and styling reuses the exact same pattern from `BuildingTypeSelector.tsx`

