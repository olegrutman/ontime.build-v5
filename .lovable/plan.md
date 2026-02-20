

# Restructure Outside Location to a Stepped Flow

## Problem
When selecting "Outside" in the work order location step, the current UI shows a single flat dropdown combining feature and direction (e.g., "Balcony - North", "Siding - Front"). This is hard to navigate and doesn't follow logical construction thinking.

## New Flow for Outside
A three-step progressive selection:

1. **Floor / Level** -- Which floor is the exterior work on? (Floor 1, Floor 2, Roof, etc.)
2. **Feature** -- What exterior feature? (Balcony, Deck, Porch, Siding, Roof, Windows, Doors, Fascia, Soffit, Other)
3. **Side / Direction** -- Which side? (Front, Back, Left, Right, North, South, East, West)

Each step only appears after the previous one is selected, using the same progressive reveal pattern already used for Inside locations.

## Changes

### File: `src/types/workOrderWizard.ts`
- Add new fields to `WorkOrderLocationData`:
  - `exterior_level?: string` -- floor for exterior work
  - `exterior_feature_type?: string` -- the feature category (balcony, siding, etc.)
  - `exterior_direction?: string` -- front/back/north/south etc.
- Add constants:
  - `EXTERIOR_FEATURE_OPTIONS` -- Balcony, Deck, Porch, Siding, Roof, Windows, Doors, Fascia, Soffit, Gutters, Other
  - `EXTERIOR_DIRECTION_OPTIONS` -- Front, Back, Left, Right, North, South, East, West, General

### File: `src/components/work-order-wizard/steps/LocationStep.tsx`
- Replace the single exterior feature dropdown with three progressive selects:
  1. Level select (reusing `levelOptions` from project scope)
  2. Feature select (from new `EXTERIOR_FEATURE_OPTIONS`)
  3. Direction select (from new `EXTERIOR_DIRECTION_OPTIONS`)
- Show "Other" text input when feature is "Other"
- Update the location summary at the bottom to show the breadcrumb: `Floor 2 > Balcony > Front`
- When user changes a parent selection, clear child selections (e.g., changing level clears feature and direction)

### File: `src/hooks/useProjectScope.ts`
- No changes needed -- `getLevelOptions()` already provides floor options that work for exterior too

### Backward Compatibility
- The old `exterior_feature` field (combined value like `balcony_north`) is kept in the type but the work order wizard will write the new separate fields instead
- The RFI location step and change order location step are not affected by this change

## Summary Display
The location summary will show:
```
Outside > Floor 2 > Balcony > Front
```

