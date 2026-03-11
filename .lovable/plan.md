

# Scope Details Step — Context-Aware Architectural Elements

## Problem
Step 4 (Scope Details) currently shows the same generic "Structural Element" list regardless of whether the work is inside or outside. Siding, fascia, and soffit have no sub-detail options despite being distinct scopes in framing.

## Changes

### 1. New option lists in `src/types/workOrderWizard.ts`

**Interior Architectural Elements** (framing-focused):
- Wall (Interior Partition), Wall (Exterior/Load-Bearing), Header, Beam, Joist (Floor), Joist (Ceiling), Rafter, Truss, Post/Column, Sill Plate, Top Plate, King Stud, Jack Stud, Cripple Stud, Blocking/Nailer, Sheathing (Wall), Subfloor/Decking, Stairway/Stringer, Landing/Platform, Furring Strip, Other

**Exterior Architectural Elements** (envelope-focused):
- Siding, Fascia, Soffit, Rake Board, Frieze Board, Corner Board/Trim, Band Board/Rim Joist, Window Trim/Casing, Door Trim/Casing, Eave, Overhang, Gable End, Roof Sheathing, Roof Edge/Drip Edge, Balcony Rail/Guard, Deck Framing, Porch Post/Column, Ledger Board, Flashing/WRB, Other

**Siding sub-types** (shown when Siding is selected):
- Lap/Clapboard, Board & Batten, T1-11/Panel, Tongue & Groove, Shake/Shingle, Plywood Sheathing, ZIP/Structural Panel, Other

**Fascia sub-types**:
- Flat Fascia Board, Sub-Fascia (Rough), Built-Up Fascia, Rake Fascia, Fascia Return, Other

**Soffit sub-types**:
- Open Soffit (Exposed Rafter Tails), Closed/Boxed Soffit, Vented Soffit Panel, T&G Wood Soffit, Fly Rafter Soffit, Other

Add new fields to `WorkOrderWizardData`: `architectural_element_sub_type?: string`

### 2. Update `ScopeDetailsStep.tsx`

- Read `data.location_data.inside_outside` to determine which element list to show
- Rename label from "Structural Element" to "Architectural Element"
- When user picks Siding, Fascia, or Soffit → show a conditional sub-type dropdown
- Scope Size options also adjust: interior keeps wall-based sizes; exterior adds "Linear Run", "Full Elevation", "Partial Elevation", "Full Perimeter"

### 3. Files

| File | Action |
|------|--------|
| `src/types/workOrderWizard.ts` | Add new option arrays + `architectural_element_sub_type` field |
| `src/components/work-order-wizard/steps/ScopeDetailsStep.tsx` | Read inside/outside, swap element list, add conditional sub-type select |

