## Reorder Location Picker: Component first, Area optional

### The problem

Today the "Where" step asks (Inside/Outside) → **Level → Area (required) → Component (optional)**.

For framers and rough-trade work this is backwards. During rough framing there are no rooms yet — joists and walls don't belong to a "Bedroom". The component (Wall / Floor / Ceiling / Roof / Stairs) is what matters first; the area is helpful context only when the building is far enough along to have rooms.

The screenshot shows exactly this: after Level 2 → Ground, Sasha demands a room before letting the user pick "Floor system / Floor joists" — the actual subject of the change order.

### What changes (Interior path)

New order: **Inside → Level → Component (required) → Sub-component (required when group has options) → Area (optional)**.

```text
Interior
  Level 2 ── pill
  Component:   [🧱 Wall] [▦ Floor] [☐ Ceiling] [🏠 Roof] [🪜 Stairs] [🪟 Opening] [🔧 MEP chase] [• Other]
  Sub-component: [Floor joists] [Floor sheathing] [Subfloor] [Floor trusses] …
  Area (optional): [Kitchen] [Living Room] … [Skip area]
```

- **Component** becomes the first required selection after Level (today it's hidden behind Area).
- **Area** moves below Component and is **always optional** with an explicit "Skip area" affordance, plus a one-line hint: *"Skip if rough framing or no rooms yet."*
- **Multifamily Unit interior** stays as a special area choice — when picked, it still asks Unit # + Room. Component remains the primary axis.
- The completion rule changes to: `level + component` is enough to confirm. Area only required if the user starts entering it (e.g., picks "Other" then must fill text, or picks "Unit interior" then must add unit #).

### What changes (Exterior path)

Already mostly correct (Elevation → Component). Tweak: make Component required and Elevation can be skipped to "Whole exterior" for things like "all four walls — WRB". Add a "Skip elevation" chip.

### Tag format

Component moves earlier in the readable tag, area trails:

- Old: `Interior · L2 · Master Bath · Floor / Floor joists`
- New: `Interior · L2 · Floor / Floor joists · Master Bath` (when area present)
- New (no area): `Interior · L2 · Floor / Floor joists`

`resolveZoneFromLocationTag` in `src/lib/resolveZone.ts` already keys on **structural / floor / wall / roof keywords first**, so reordering the tag does not change zone resolution. Verified by re-reading the rule order — structural members and component keywords win regardless of position.

### Recent-locations shortcut

Stays as-is. The "Same as last time" banner at the top still one-taps the full saved tag.

### Files affected

- `src/components/change-orders/VisualLocationPicker.tsx` — reorder JSX blocks (Component before Area), update `isComplete` logic, update `assembledTag` to put component before area, add "Skip area" affordance, add hint copy.
- `src/lib/buildingComponents.ts` — already returns the right groups based on level + interior/exterior. No change needed; the function is called with `selectedArea` today only as a gate, but it doesn't actually use the area. Confirmed safe.
- `src/test/resolveZone.test.ts` — add 2 cases for the new tag order to lock the contract: `Interior · L1 · Floor / Floor joists` → `interior_floor`; `Interior · L1 · Wall / Demising wall` → `interior_wall`.
- No DB changes. No edge function changes.

### Sasha (downstream) behavior

Because the component is now captured every time, Sasha's intent flow gets a stronger signal earlier. The `assembly_state` prompt (Phase D, deferred) will still trigger only when the resolved zone is one of `interior_floor / interior_wall / exterior_wall / roof` — same rule, just fires sooner because the component is no longer optional.

### Out of scope for this turn

- Phase D UI (trigger chips, assembly-state prompt, auto-sequenced tasks, per-task pricing) — still queued behind this fix.
- Mobile compact mode follows the same reorder automatically since it shares the same component.

### Acceptance check

1. New CO → Where → Interior → Level 2 → tap **Floor → Floor joists** → "Confirm location" is enabled with no area selected. Tag reads `Interior · L2 · Floor / Floor joists`.
2. Same flow + tap **Master Bath** afterwards → tag reads `Interior · L2 · Floor / Floor joists · Master Bath`.
3. Mechanical-conflict scenario: Interior → Level 1 → **Floor → Floor joists** → confirms cleanly without forcing a room. Sasha's downstream zone resolves to `interior_floor`.
4. Exterior → tap **Skip elevation** → **Wall (exterior) → WRB / housewrap** → confirms as `Exterior · Wall (exterior) / WRB / housewrap`.
