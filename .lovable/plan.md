
# CO/WO Wizard Restructure: Description-First, Pricing Deferred

## Core Principle

The wizard creates the CO/WO as a **scope + routing document**. No one prices during creation. Pricing happens on the CO detail page after the right parties (TC, FC) are involved.

## New Step Flow (All Roles)

| Step | Label | Main Area | Sidebar |
|------|-------|-----------|---------|
| 1 | Where & Why | Location, system, cause | Live item description card |
| 2 | Scope | Catalog browser, narrative, attachments | Item description + work types list |
| 3 | Routing & Responsibilities | Pricing model choice, assign TC, request FC, material/equipment responsibility toggles | Routing summary (who's assigned, what's requested) |
| 4 | Review | Full roll-up of all items | Combined description + routing |

**Key changes from current:**
- No labor hours entry, no materials cost entry, no markup input, no totals panel — anywhere in the wizard
- Materials & equipment sections become **needs flags only** ("Materials needed? Y/N", "Equipment needed? Y/N", responsibility toggle) — not itemized cost entry
- The pricing model selector (Fixed / T&M / NTE) stays on step 3 because it determines how the CO will later be priced on the detail page

## Sidebar Redesign

### Steps 1-2: Item Description Panel

Replace the current financial summary with a structured description card per item:

- Location pin + location text
- System badge (e.g., "Electrical")
- Cause / reason with CO vs WO badge + billable indicator
- Work type names (as they're selected on step 2)
- Narrative preview snippet (first ~100 chars)
- Scope completeness indicator: Location check, Cause check, Scope circle — guiding what's still needed

The navy bottom block becomes a **completeness summary** instead of dollar totals.

### Step 3: Routing Summary Panel

Item cards stay, but show routing info instead of prices:

- Pricing model badge (Fixed / T&M / NTE)
- Assigned TC name
- FC requested? Yes/No
- Materials responsibility: TC or GC
- Equipment responsibility: TC or GC

Navy bottom block shows routing chain visualization.

### Step 4: Review

Combined view — description + routing for each item. No dollar amounts.

## Technical Changes

### 1. `PickerAside.tsx` — Step-aware sidebar

- Remove all financial calculations (`itemLaborTotal`, `itemMaterialTotal`, etc.) and the navy totals panel
- Add `state.step` awareness to render:
  - Steps 1-2: Item description cards with completeness
  - Steps 3-4: Item cards with routing summary
- Remove markup% display from item cards entirely
- Keep "Add another item" button on all steps

### 2. `StepPricingAndRouting.tsx` — Strip pricing inputs, keep routing

- Remove the entire "Labor" section (hour inputs, rate display)
- Remove the itemized materials cost entry form (description, qty, unit cost)
- Remove the itemized equipment cost entry form
- Remove the markup input and totals breakdown
- Remove the "Add Another / Go to Review" cards at the bottom (navigation handled by sidebar)
- **Keep**: Pricing model selector (Fixed / T&M / NTE)
- **Keep**: Collaboration & Routing section (assign TC, request FC, FC auto-routing for FC role)
- **Keep**: RoutingChain visualization
- **Replace** materials/equipment section with simple toggles: "Materials needed?" switch + responsibility (TC/GC), "Equipment needed?" switch + responsibility (TC/GC)
- Rename step label from "Pricing & Routing" to "Routing & Responsibilities"

### 3. `types.ts` — Simplify item state

- Remove `laborEntries` from `PickerItem` (or keep but unused — defer cleanup)
- Remove `materials: MaterialDraft[]` and `equipment: EquipmentDraft[]` arrays
- Add `materialsNeeded: boolean` and `equipmentNeeded: boolean` flags
- Keep `materialResponsible` and `equipmentResponsible` toggles
- Remove `markup` field
- Remove `itemLaborTotal`, `itemMaterialTotal`, `itemEquipmentTotal`, `itemSubtotal`, `grandTotal` exports (or mark deprecated)

### 4. `usePickerState.ts` — Remove pricing actions

- Remove handlers for: `SET_LABOR_HOURS`, `ADD_MATERIAL`, `REMOVE_MATERIAL`, `ADD_EQUIPMENT`, `REMOVE_EQUIPMENT`, `SET_MARKUP`
- Add: `SET_MATERIALS_NEEDED`, `SET_EQUIPMENT_NEEDED` toggle actions
- Update `blankItem()` to remove `laborEntries`, `materials`, `equipment`, `markup`
- Update `ADD_ITEM` to not inherit pricing fields

### 5. `StepTotal.tsx` — Delete entirely

This step no longer exists. The "item total" concept is deferred to the detail page.

### 6. `StepReview.tsx` — Remove financial columns

- Remove dollar amount columns from the items table
- Show: location, system, cause, work types, narrative snippet, pricing model, routing
- Remove grand total display

### 7. `PickerShell.tsx` — Update submit logic

- Stop inserting `co_labor_entries` during creation
- Stop inserting `co_material_items` during creation
- Stop inserting `co_equipment_items` during creation
- Set `materials_needed` and `equipment_needed` flags on the `change_orders` insert
- Remove `markup` from insert calculations
- Keep all routing logic (TC assignment, FC collaboration) as-is

### 8. `PICKER_STEPS` constant — Rename step 3

```
{ key: 'routing', label: 'Routing', num: 3 }
```

### 9. Update tests

- `pickerReducer.test.ts` and `pickerTypes.test.ts` — update for removed fields/actions

## What stays unchanged

- The CO detail page (where pricing will happen after creation)
- The database schema (no migrations needed)
- The routing/assignment logic in PickerShell submit
- The scope catalog browser
- The cause/system/location selection steps

## Files to modify

- `src/components/change-orders/picker-v3/types.ts`
- `src/components/change-orders/picker-v3/usePickerState.ts`
- `src/components/change-orders/picker-v3/PickerAside.tsx`
- `src/components/change-orders/picker-v3/StepPricingAndRouting.tsx`
- `src/components/change-orders/picker-v3/StepReview.tsx`
- `src/components/change-orders/picker-v3/PickerShell.tsx`
- `src/test/pickerReducer.test.ts`
- `src/test/pickerTypes.test.ts`

## Files to delete

- `src/components/change-orders/picker-v3/StepTotal.tsx`
