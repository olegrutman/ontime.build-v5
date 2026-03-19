

## Upgrade CO wizard location step to RFI-style structured location picker

**Current state**: `StepLocation` uses flat chip groups (Buildings, Levels, Units, Elevations, Other) — generic and imprecise.

**Target**: Replace with the same structured Inside/Outside → Level → Unit → Room/Area → Exterior Feature flow used in `RFILocationStep`, driven by `useProjectScope` data (foundation type, floors, balconies, siding, roof deck, etc.). The final `locationTag` string is built from the structured selections (e.g. "Inside → Floor 2 → Unit 3 → Kitchen" or "Outside → Balcony - North").

### Changes

**`src/components/change-orders/wizard/StepLocation.tsx`** — full rewrite:

1. **Add structured state fields** — Instead of a flat chip set, use `inside_outside`, `building` (if multi-building), `level`, `unit`, `room_area`, `custom_room_area`, `exterior_feature`, `custom_exterior` parsed from/serialized to `data.locationTag`.

2. **Inside/Outside toggle** — Two large toggle buttons (reuse the same pattern as RFI step with `Home` and `Building2` icons).

3. **Inside flow** (driven by project scope):
   - Building selector (only if `scope.num_buildings > 1`) — dropdown with Bldg A, B, C...
   - Level selector — uses `getLevelOptions(scope)` which respects basement, floor count, attic, mezzanine
   - Unit input (only if `scope.num_units > 1`) — free text input
   - Room/Area dropdown — uses `ROOM_AREA_OPTIONS` from `@/types/location`, with "Other" triggering a custom input

4. **Outside flow** (driven by project scope):
   - Exterior feature dropdown — uses `getExteriorOptions(scope)` which respects balconies, siding, roof deck, fascia, soffit, decorative items, covered porches, decking
   - "Other" triggers a custom input

5. **Live preview** — Bottom summary showing the built location string (e.g. "Bldg A → Floor 2 → Unit 5 → Kitchen")

6. **Serialize to `locationTag`** — On each change, build a human-readable string from the structured fields and call `onChange({ locationTag: ... })`. This keeps the CO data model unchanged.

**`src/components/change-orders/wizard/COWizard.tsx`** — Update `canAdvance` for the location step to check that at least `inside_outside` is selected plus one sub-field (level or exterior feature).

### No other files change
- The `useProjectScope` hook and `getLevelOptions`/`getExteriorOptions` helpers already exist
- `ROOM_AREA_OPTIONS` already exists in `@/types/location`
- The `locationTag` field on the CO model stays as a string

