

# Bug & Redundancy Analysis: Project Setup Pipeline

## Critical Redundancies Found

### 1. Building Features Asked TWICE
**PhaseBuilding** (Phase 1) asks about: stairs, balcony, corridors, elevator, garage, foundation, framing system, floor system, roof system, stories, units, buildings.

**FramingScopeWizard Section 2 (StructureSection)** asks about: stairs, elevator shaft, corridors, breezeways, balconies, tuck-under garages, patios, community spaces — with child panels for each.

**FramingScopeWizard Section 1 (MethodSection)** asks about framing method (stick/panelized/hybrid) — which PhaseBuilding also asks as "Framing System."

The user answers stairs, balcony, corridors, elevator, garage, and framing method **in both Phase 1 and Phase 2**. These are not even synced — they save to different tables (`project_profiles` vs `project_framing_scope`).

### 2. Old Scope Fields Still in `project_profiles`
The `ProjectProfile` type still has 20+ `scope_*` fields from the old wizard: `scope_windows_install`, `scope_siding`, `scope_wrb`, `scope_backout`, `scope_soffit_fascia`, `scope_exterior_trim`, etc. These are now fully handled by `project_framing_scope`. PhaseBuilding's `emptyDraft()` initializes all of them, but nothing reads them anymore.

### 3. `buildingType` Not Derived from Phase 1 Data
`ProjectSetupFlow` derives `buildingType` from `projectType` prop (passed from `ProjectHome`), but **PhaseBuilding** saves a `project_type_id` to `project_profiles`. After the user picks a type in Phase 1, the scope wizard doesn't re-read it — it still uses the prop that was set at page load.

### 4. Material Responsibility in Wrong Phase
The plan said Phase 3 (Contracts) would handle material responsibility, but it's actually asked in Phase 2 Section 1 (MethodSection). PhaseContracts doesn't ask about or display material responsibility at all. This isn't necessarily a bug but contradicts the stated data flow.

---

## Fix Plan

### Remove duplicate questions from PhaseBuilding
Strip PhaseBuilding down to **building definition only** — the physical structure, not scope. Keep: project type, stories, units, buildings, foundation, floor system, roof system. **Remove**: framing system (asked in scope Section 1), balcony toggle (asked in scope Section 2), corridors (asked in scope Section 2). These are scope questions, not building definition.

### Seed FramingScopeWizard from PhaseBuilding data
When Phase 2 loads, pre-populate scope Section 2 answers from `project_profiles` data:
- `has_garage` → `structure.tuck_under_garages` default
- `has_stairs` → `structure.wood_stairs` default  
- `has_elevator` → `structure.elevator_shaft` default
- `has_balcony` → `structure.balconies` default
- `has_corridors` → `structure.enclosed_corridors` default

This way the user sees pre-filled toggles (not blank), but can still customize the scope detail (child panels).

### Remove dead `scope_*` fields from PhaseBuilding's emptyDraft
Stop initializing the 20+ `scope_*` fields that nothing reads. Keep the `ProfileDraft` type but stop setting scope fields in the setup flow.

### Fix buildingType derivation
After PhaseBuilding saves, re-derive `buildingType` from the saved `project_type_id` instead of the static prop. Use the profile query data that's already fetched.

## Files Modified
- `src/components/project-setup/PhaseBuilding.tsx` — remove framing system, balcony, corridor questions; remove dead scope field initialization
- `src/components/project-setup/ProjectSetupFlow.tsx` — derive buildingType from saved profile instead of static prop
- `src/hooks/useFramingScope.ts` — accept initial defaults from profile data to pre-seed Section 2 answers

## Files NOT Changed
- FramingScopeWizard sections — keep as-is, they are the source of truth for scope
- Database — no schema changes
- PhaseContracts, PhaseSOV — untouched

