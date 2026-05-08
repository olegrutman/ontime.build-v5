## Goal

The CO Picker's "Where is the work happening?" step currently labels floors generically (Level 1 / Ground floor, Level 2 / Second floor, then Basement appended at the end). This doesn't reflect how the project was actually set up. When a basement exists, it IS the ground level, and Floor 1 is the Main Floor — not "Ground floor".

## Fix

Update `buildLocations()` in `src/components/change-orders/picker-v3/StepWhere.tsx` to generate floor labels based on the real project structure pulled from `project_scope_details` (already queried).

### New labeling rules

When a basement exists (`foundation_type` ≈ "basement" or `basement_type` set):

```text
Basement       — Ground level (or basement_type, e.g. "Walkout / Standard")
Main Floor     — Level 1
Second Floor   — Level 2
Third Floor    — Level 3
…
Attic          — if attic_type / has_attic
Roof           — if roof_type
Exterior       — always
```

When no basement:

```text
Main Floor     — Ground level (Level 1)
Second Floor   — Level 2
Third Floor    — Level 3
…
Roof / Exterior as above
```

For multi-unit / apartments (`home_type` like `apartments_mf`, `num_buildings > 1`), keep current per-building entries but apply the same floor naming inside each.

### Ordinal helper

Add a small `floorLabel(n)` helper:
- 1 → "Main Floor"
- 2 → "Second Floor"
- 3 → "Third Floor"
- 4 → "Fourth Floor"
- 5+ → "Level N" fallback

Sub-text shows the matching `Level N` so users still see the numeric reference (e.g. label: "Main Floor", sub: "Level 1").

### Order

1. Basement (if any)
2. Main Floor → upper floors in ascending order
3. Attic (if any)
4. Roof
5. Exterior
6. Additional buildings (if multi-building)
7. Balcony / Deck (if applicable)
8. Other / Custom

## Files touched

- `src/components/change-orders/picker-v3/StepWhere.tsx` — rewrite `buildLocations()` and add `floorLabel()` helper. No other files, no DB changes, no business-logic changes outside this presentational mapping.

## Out of scope

- Changing the project setup wizard.
- Changing how locations are stored on CO items (still saved as the visible label string).
- Renaming any other "Level N" usage outside the CO picker.
