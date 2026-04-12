

# Make Location Picker Scope-Aware

## What changes
The `VisualLocationPicker` will read the building info saved during project setup and dynamically show only relevant options — no more hardcoded `isMultifamily = true`.

## File: `src/components/change-orders/VisualLocationPicker.tsx`

### 1. Derive building characteristics from scope
Replace the hardcoded `isCommercial` and `isMultifamily` booleans with actual lookups:
```
const homeType = scope?.home_type;
const isMultifamily = ['apartments_mf', 'townhomes', 'hotel_hospitality', 'senior_living'].includes(homeType);
const isSingleFamily = ['custom_home', 'track_home'].includes(homeType);
```

### 2. Filter Inside → Area options by building type
- **Single family**: Show `Bedroom, Bathroom, Kitchen, Living Room, Laundry, Garage (if scope has garage), Other` — hide "Unit interior" and "Corridor"
- **Multifamily**: Show current options (Unit interior, Corridor, Stairwell, Other)
- **If garage exists** (scope `garage_type` ≠ 'None'): Add "Garage 🚗" to area options

### 3. Filter Outside → Elevation by building type
- **Single family**: Front, Rear, Left side, Right side, Roof, Other (already exists as `SINGLE_FAMILY_ELEVATIONS`)
- **Multifamily**: N/S/E/W elevations, Roof, Other (already exists as `MULTIFAMILY_ELEVATIONS`)
- Actually wire this up using the derived `isMultifamily` boolean instead of the hardcoded `true`

### 4. Level pills from scope (fix fallback)
The existing `getLevelOptions(scope)` already works when scope exists. Fix the fallback path (lines 98-105) to also check `scope?.stories` and `scope?.foundation_type` directly, not just the profile.

### 5. No other files change
- `useProjectScope` already fetches everything needed
- `TMBuildingInfoStep` already saves to `project_scope_details`
- TMWOWizard already passes `projectId` to `VisualLocationPicker`

## Summary of filtering logic

| Building type | Inside areas | Outside elevations | Levels |
|---|---|---|---|
| Custom/Track Home | Kitchen, Bath, Bedroom, Living, Laundry, Garage*, Other | Front, Rear, Left, Right, Roof | Based on stories + basement |
| Apartments/MF | Unit interior (w/ unit #), Corridor, Stairwell, Other | N, S, E, W, Roof | Based on stories + basement |
| Townhomes | Unit interior, Corridor, Stairwell, Other | N, S, E, W, Roof | Based on stories + basement |
| Hotel/Senior | Unit interior, Corridor, Stairwell, Other | N, S, E, W, Roof | Based on stories + basement |

\* Garage area shown only when `garage_type` is Attached or Detached

