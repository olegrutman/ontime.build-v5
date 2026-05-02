
# Fix CO/WO Picker v3 — End-to-End

The wizard renders but has multiple non-functional elements and data bugs preventing real use.

## Bugs Found

### Critical (prevents submission)
1. **Invalid reason code in submit** — `reason: cur.reason ?? 'owner_upgrade'` but `owner_upgrade` is not a valid enum value. Should be `'owner_request'`.
2. **Invalid `entered_by_role` for GC** — Labor entries set `entered_by_role: detectedRole` which can be `'GC'`, but `co_labor_entries.entered_by_role` only accepts `'FC' | 'TC'`. GC-created labor should default to `'TC'`.
3. **Missing `line_number`** on material inserts — the `co_material_items` table requires `line_number` but the insert doesn't calculate it (uses index `mi` but the column name isn't set).

### High (dead buttons / no functionality)
4. **"+ From Catalog" and "Custom Item" buttons** on Step 7 (Materials) have no `onClick` handlers — completely dead.
5. **"Add Photos", "Attach RFI", "Pin to Plan" buttons** on Step 6 (Scope) have no handlers.
6. **Locations are hardcoded** — Step 1 shows fake locations instead of pulling from the project's actual building structure (`project_scope_details` or project profile).
7. **Work types are hardcoded** — Step 5 shows static suggestions not tied to the selected system.

### Medium (UX gaps)
8. **No step validation** — user can skip to Review and submit a blank CO with no location, cause, or work types.
9. **`project_team` query in StepWho** — references `project_team` table which may not match the schema; should use `project_participants`.

## Fix Plan

### 1. Fix submit logic (PickerShell.tsx)
- Change fallback reason from `'owner_upgrade'` to `'owner_request'`
- Map `entered_by_role`: if detectedRole is `'GC'`, use `'TC'`; otherwise use detectedRole
- Fix material `line_number` to use `mi + 1`

### 2. Wire Materials & Equipment buttons (StepMaterialsEquipment.tsx)
- Add inline "Custom Item" form (dialog or expandable row) that dispatches `ADD_MATERIAL` / `ADD_EQUIPMENT`
- Add "From Catalog" button that opens the existing `CatalogSearch` component to pick items

### 3. Pull real locations from project data (StepWhere.tsx)
- Query `project_scope_details` for the project's building structure
- Fall back to the current hardcoded list if no scope data exists

### 4. Add basic step validation
- Track which steps are "complete" (location selected, cause selected, etc.)
- Disable Next / Submit when current step requirements aren't met
- Show visual indicators on stepper for completed vs incomplete steps

### 5. Fix StepWho table reference
- Replace `project_team` query with `project_participants` to match the actual schema

### 6. Mark attachment buttons as "Coming Soon"
- Add disabled state + tooltip for Photos/RFI/Pin buttons since those features aren't built yet

## Technical Details

- All changes are frontend-only (no migrations needed)
- Primary files: `PickerShell.tsx`, `StepMaterialsEquipment.tsx`, `StepWhere.tsx`, `StepWho.tsx`, `StepScope.tsx`, `PickerStepper.tsx`
- The custom material form needs fields: description, quantity, unit, unit cost, and optionally SKU/supplier
