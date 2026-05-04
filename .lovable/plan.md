
## Bug: Scope step ignores selected system

**Root cause**: `StepScopeCombined.tsx` has two hardcoded arrays (`SUGGESTED_WORK` and `OTHER_WORK`) that are always floor-system oriented (joists, subfloor, blocking). The `cur.system` value from Step 1 is never read — work types don't change regardless of which system is selected.

**Evidence**: Line 112 even says `"Other floor system work"` as a static label.

### Fix

Replace the two hardcoded arrays with a **system-keyed map** of work types. When rendering, look up `cur.system` (e.g. `'wall'`, `'roof'`, `'floor'`) and display the matching set.

#### Work type sets to create (per system)

| System | Suggested | Other |
|--------|-----------|-------|
| **Floor** | Remove existing framing, Add header/install LVL, Install hangers/straps, Modify joist bay, Patch ceiling below | Cut/notch joists, Sister joists/reinforce, Add blocking/bridging, Repair/replace subfloor |
| **Wall** | Remove/relocate wall, Add header/install LVL, Frame new partition, Sheathing repair/install, Patch drywall | Add blocking for fixture, Install cripple studs, Reinforce bearing wall, Add shear panel |
| **Roof** | Re-frame rafter, Install ridge board/beam, Add collar ties/straps, Sheathing repair, Fascia/soffit repair | Add roof blocking, Install purlin, Modify overhang, Repair valley framing |
| **Ceiling** | Frame ceiling drop/soffit, Install ceiling joists, Add furring/strapping, Patch ceiling, Modify for MEP routing | Add blocking for fixture, Sister ceiling joist, Build bulkhead, Frame tray ceiling |
| **Exterior** | Install housewrap/WRB, Flash window/door opening, Repair sheathing, Install rain screen, Seal penetrations | Install sill pan, Apply fluid WRB, Repair corner detail, Install kick-out flashing |
| **Openings** | Frame rough opening, Install header, Set window/door bucks, Flash opening, Modify existing RO | Add jack/king studs, Install sill plate, Widen/narrow opening, Add structural post |
| **Deck/Balcony** | Install deck joists, Install ledger board, Set posts/footings, Install decking, Add railing framing | Add blocking/bridging, Install beam, Repair joist, Waterproof membrane |
| **Stair** | Cut/install stringers, Install treads/risers, Frame landing, Add handrail post blocking, Modify headroom | Sister stringer, Add skirt board, Reinforce landing, Adjust rise/run |
| **Other** | General framing, Install blocking, Structural repair, Demo/remove, Custom work item | Reinforce existing, Add backing, Modify structure, Patch/repair |

#### Changes

1. **`StepScopeCombined.tsx`** — Replace `SUGGESTED_WORK` / `OTHER_WORK` constants with a `WORK_BY_SYSTEM` map keyed by system ID. Read `cur.system` to select the correct set. Update the "Other floor system work" label to dynamically say "Other {systemName} work". Fall back to the "Other" set if `cur.system` is null.

2. **Clear work types on system change** — In `usePickerState.ts`, when handling `SET_SYSTEM`, also clear `workTypes` and `workNames` so stale selections from a previous system don't persist.

No database changes needed.
