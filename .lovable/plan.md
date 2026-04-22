

## Plan — Add "Building Component" to the Where step

Right now the **Where** step in the CO/WO wizard captures only *spatial* location:

- **Interior** → Level (Floor 1, Floor 2…) → Area (Kitchen, Bedroom, Corridor…)
- **Exterior** → Elevation (Front, Rear, North, South…)

That tells us *where in the building* the work happens, but not *what physical assembly* the work touches. A change order for "patch drywall on wall in Bedroom 2" is very different from "sister joists in floor system above Bedroom 2" — same room, completely different scope. Today the user has to type that into the description.

### What we'll add

A new optional sub-selector after Area / Elevation called **Building Component** — the actual real-world assembly being worked on. The suggestions change based on the building type from project scope.

**Component groups (universal):**

- **Wall systems** — Interior partition · Demising wall (between units) · Shear wall · Exterior wall (interior face) · Plumbing wall · Soffit / bulkhead
- **Floor system** — Floor sheathing · Floor joists / I-joists · Floor trusses · Subfloor · Concrete slab · Floor underlayment
- **Ceiling system** — Ceiling drywall · Ceiling joists · Suspended / drop ceiling · Bulkhead · Coffer
- **Roof system** — Roof sheathing · Rafters · Roof trusses · Ridge / valleys · Eaves
- **Vertical circulation** — Stair stringers · Stair treads · Landing · Railing
- **Openings** — Window opening · Door opening · Header
- **MEP rough-in zones** — Mechanical chase · Plumbing chase · Electrical chase

**Building-type-aware suggestions** (driven by `home_type`, `framing_method`, `construction_type`, `has_shared_walls`, `floors`, `roof_type` from `project_scope_details`):

| Building type | Component suggestions emphasized |
|---|---|
| Custom / Track home (single-family) | Interior partition, Floor joists, Ceiling drywall, Rafters/Trusses, Stair stringers |
| Townhomes (`has_shared_walls`) | **Demising wall** promoted, Shear wall, Floor system between units (acoustic) |
| Apartments / Hotel / Senior living (multifamily) | **Demising wall**, Corridor wall, Shaft wall, Floor/ceiling assembly (1-hr rated), Elevator shaft wall |
| Commercial / mid-rise (`construction_type` = steel/concrete) | Metal stud partition, Concrete slab, Steel deck, Curtain wall back-up |
| Exterior context | Sheathing, WRB, Siding back-up, Fascia, Soffit, Roof deck |

If `framing_method` is `steel` we swap "joists" for "steel joists / bar joists"; if `metal_stud` we change wall labels to "metal stud partition." If a level is **Basement** with foundation = concrete, we surface **Concrete slab, Foundation wall, Sill plate**. If level is **Attic**, we surface **Rafters, Ceiling joists, Roof sheathing** only.

### How the UI changes

In `VisualLocationPicker.tsx`, after the user picks an Area (interior) or Elevation (exterior), a new optional pill row appears:

```text
COMPONENT (optional)
[ Wall ] [ Floor system ] [ Ceiling ] [ Roof ] [ Stairs ] [ Opening ] [ MEP chase ] [ Other ]
```

Picking a top-level component reveals a second small pill row with the specific sub-component (e.g. "Wall" → `Interior partition · Demising wall · Shear wall · Exterior wall (interior face) · Plumbing wall`). The sub-list is filtered by building type per the table above.

The assembled location tag then becomes:

```text
Interior · Floor 2 · Bedroom 2 · Floor system / Floor joists
```

Component is **optional** — users can skip it entirely and the existing flow keeps working. We add a small "Skip component" link.

### Where it shows up later

- The component string is appended to `location_tag` (no schema change needed) so it flows into line items, AI scope descriptions, PDF exports, and the "Same as last time?" shortcut for free.
- AI scope descriptions automatically get richer ("Repair floor joists at Bedroom 2, Floor 2" instead of "Repair at Bedroom 2").

### Files to modify

1. **New** `src/lib/buildingComponents.ts` — pure helper exporting `getComponentGroups(scope, level, isExterior)` returning the building-type-aware list. Keeps logic out of the React component, mirrors the pattern of `useProjectScope.ts` helpers.
2. **Edit** `src/components/change-orders/VisualLocationPicker.tsx` — add `selectedComponent` + `selectedSubComponent` state, render the two new pill rows after Area / Elevation, append to `assembledTag`, update `isComplete` (component remains optional so completion logic unchanged unless we want to require it).
3. **Edit** `src/hooks/useProjectScope.ts` — re-export the helper for convenience (optional).

No database migration. No new types in `changeOrder.ts` (lives inside the existing `location_tag` string). Backward-compatible with every existing CO/WO.

### Open question for you

Should the component selector be:

- **(A) Optional** — user can skip; tag includes component only when chosen. *(recommended — keeps quick-flow fast)*
- **(B) Required** — every CO must specify a component. *(more structured data, slower UX)*

Default in plan is **(A)**. Tell me "make it required" if you want (B).

