

# Fix: TC Can't Add Materials/Equipment After CO Creation

## Problem
The Materials and Equipment panels on the CO detail page are conditionally rendered only when `co.materials_needed` or `co.equipment_needed` is `true` (set during wizard creation). If the TC didn't check those boxes in the wizard, there's no way to add materials or equipment after the fact. The panels simply don't appear.

## Solution
Always show Materials and Equipment panels for the CO owner (TC) when they can edit, regardless of the `materials_needed`/`equipment_needed` flags. When the TC adds their first material or equipment item, auto-update the corresponding flag to `true` on the CO record.

## Changes

### 1. Update `CODetailLayout.tsx` — always show panels for TC
Change the render conditions on lines 346 and 360:
- Materials: `(co.materials_needed || materials.length > 0)` → add `|| (isTC && canEdit)`
- Equipment: `(co.equipment_needed || equipment.length > 0)` → add `|| (isTC && canEdit)`

This ensures TC always sees both panels when they have edit access.

### 2. Update `COMaterialsPanel.tsx` — auto-set `materials_needed` on first add
After a successful material insert, if `co.materials_needed` is false, update the CO record to set `materials_needed = true`. This ensures the panel remains visible and other roles see it correctly.

### 3. Update `COEquipmentPanel.tsx` — auto-set `equipment_needed` on first add
Same pattern: after inserting equipment, set `equipment_needed = true` on the CO if not already set.

### 4. Update KPI strip condition (line 236)
Also update the `hasMaterials` / `hasEquipment` props on the KPI strip to include the `isTC && canEdit` condition so KPI tiles are consistent.

## Technical Detail
- No database or RLS changes needed — the INSERT policies already check `user_in_org(auth.uid(), org_id)` which passes for TC
- The `materials_needed` / `equipment_needed` flags are simple booleans on `change_orders` table, updatable by TC via existing UPDATE RLS policy
- Both panels already accept `canEdit` prop and handle the add UI internally

