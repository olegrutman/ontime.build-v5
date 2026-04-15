

# Smart Location Picker — Project-Aware with Real-World Logic

## What Changes

Rebuild `VisualLocationPicker` to dynamically generate room/area options from actual project scope data and apply construction logic constraints.

## Key Logic Rules

1. **Bedroom/Bathroom counts**: If project has 3 bedrooms, show "Bedroom 1", "Bedroom 2", "Bedroom 3" instead of generic "Bedroom". Same for bathrooms (including half-baths from decimal counts like 2.5).
2. **Level-aware area filtering**: Basement level only shows basement-appropriate rooms (Utility, Storage, Laundry, Bedroom if finished basement). Garage only appears on Ground level (or Basement if scope says so). No "Kitchen" on attic level.
3. **Garage awareness**: Only show Garage if `garage_type` is not "None"/null. Label includes type: "Garage (Attached)" or "Garage (Detached)".
4. **Elevator/Stairwell**: Only show "Elevator shaft" if `has_elevator` is true. Stairwell shown for multi-story buildings.
5. **Multifamily unit counts**: If `num_units` is set, show unit number input with a hint like "1–24 units". If `stories_per_unit` > 1 (e.g., townhomes), show sub-level within unit.
6. **Exterior constraints**: Balcony options only if `has_balconies`. Porch only if `has_covered_porches`. Deck only if `decking_included`. Already partially done — extend to the elevation picker in the VisualLocationPicker (currently it uses hardcoded SINGLE_FAMILY_ELEVATIONS ignoring scope).
7. **Update `ProjectScopeDetails` interface**: Add `bedrooms`, `bathrooms`, `garage_cars`, `total_sqft`, `lot_size_acres`, `framing_method` fields that exist in DB but aren't in the TS interface.

## Files to Modify

### 1. `src/hooks/useProjectScope.ts`
- Add missing fields to `ProjectScopeDetails` interface: `bedrooms`, `bathrooms`, `garage_cars`, `total_sqft`, `lot_size_acres`, `framing_method`
- New export: `getAreaOptionsForLevel(scope, level, isMultifamily)` — returns filtered room/area options based on level + scope data
- Logic: Basement → [Utility, Storage, Laundry, Bedroom (if finished), Other]. Ground → full list with garage. Upper floors → no garage. Attic → [Storage, Other].

### 2. `src/components/change-orders/VisualLocationPicker.tsx`
- Replace hardcoded `SINGLE_FAMILY_AREAS` / `MULTIFAMILY_AREAS` with dynamic `areaOptions` derived from `getAreaOptionsForLevel(scope, selectedLevel, isMultifamily)`
- When `scope.bedrooms > 1`: expand "Bedroom" into "Bedroom 1", "Bedroom 2", etc.
- When `scope.bathrooms > 1`: expand into "Bathroom 1", "Bathroom 2" (+ "Half Bath" if fractional)
- Replace hardcoded elevation options with scope-driven exterior using existing `getExteriorOptions(scope)` for both single and multifamily
- Add hint text showing project context: e.g., "3-story custom home with basement" under the level selector
- Stairwell option only shown for multi-story (floors > 1)
- Elevator option only if `has_elevator`

### 3. `src/types/location.ts`
- No structural changes needed, but ensure `ROOM_AREA_OPTIONS` (used by RFI) stays untouched

## Technical Details

**Level → Area mapping logic:**
```text
Basement (any)     → Utility Room, Storage, Laundry, Bedroom* (if finished), Mechanical, Other
Ground / Floor 1   → Kitchen, Living Room, Dining Room, Bedroom*, Bathroom*, Laundry, Closet, Garage*, Mudroom, Pantry, Other
Floor 2+           → Bedroom*, Bathroom*, Living Room, Closet, Laundry, Other
Attic              → Storage, Mechanical, Other
Mezzanine          → Open area, Storage, Other

* = expanded by count from scope
```

**Bedroom expansion example (3 bedrooms):**
```text
Bedroom 1 🛏️ | Bedroom 2 🛏️ | Bedroom 3 🛏️ | Primary Suite 🛏️
```
Primary Suite always shown for single-family homes (separate from numbered bedrooms).

**No changes to**: submission logic, tag assembly format, RFI location step, database schema.

