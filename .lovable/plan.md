

# Material Responsibility Visibility and Reassignment

## Problem

Material responsibility (who provides and pays for materials -- GC or TC) is currently buried in the project setup with minimal explanation, missing from the project overview entirely, and not shown during the wizard review step. GCs and TCs need to clearly see and manage this critical setting.

## What Changes

### 1. Project Setup Wizard -- Clearer Material Responsibility (ContractsStep.tsx)

Enhance the existing material responsibility toggle on TC contracts:
- Add an info callout explaining the implications: "The responsible party can view supplier pricing, finalize Purchase Orders, and control material ordering for this contract."
- Add a visual indicator (Package icon) next to the toggle label
- Show the current selection's meaning inline (e.g., "GC will manage material ordering and see supplier pricing" or "TC will manage material ordering and see supplier pricing")

### 2. Wizard Review Step -- Show Material Responsibility (ReviewStep.tsx)

In the Contracts review section, add a "Material Responsibility" line for each TC contract showing:
- A Package icon with "Materials: GC" or "Materials: TC"
- This applies to both the GC view (single contracts card) and TC view (upstream contract card)

### 3. Project Overview -- Material Responsibility Display (ProjectContractsSection.tsx)

Add material responsibility info to the Contracts section on the overview:
- For each contract row involving a TC, show a small badge/indicator: "Materials: GC" or "Materials: TC" alongside the contract
- This makes it immediately visible who controls ordering and pricing for each relationship
- Fetch `material_responsibility` from the contracts query (already returned but not displayed)

### 4. Project Overview -- Reassignment Capability (ProjectContractsSection.tsx)

Add the ability to reassign material responsibility from the overview:
- Add a small "Edit" button on the material responsibility indicator (visible only to users with contract management permissions)
- Clicking opens a compact inline popover with GC/TC toggle and a Save button
- On save, updates `project_contracts.material_responsibility` directly
- Shows a toast confirmation

## Files to Modify

### `src/components/project-wizard-new/ContractsStep.tsx`
- Enhance the material responsibility section within `ContractCard` with:
  - A Package icon in the label
  - A description paragraph below the toggle explaining the impact of the selection
  - Color-coded text showing current selection meaning

### `src/components/project-wizard-new/ReviewStep.tsx`
- In both the GC contracts list and TC upstream/downstream contracts, add a material responsibility line item for TC-related contracts
- Display "Materials: GC" or "Materials: TC" with Package icon

### `src/components/project/ProjectContractsSection.tsx`
- In `ContractRow`, add material responsibility display:
  - Query already returns `material_responsibility` from contracts
  - Show Package icon + "GC" or "TC" badge next to the contract details
  - Only displayed when `material_responsibility` is not null (TC contracts)
- Add inline editing popover:
  - Small edit icon button next to the badge (permission-gated)
  - Popover with ToggleGroup (GC/TC) and Save button
  - Calls `supabase.from('project_contracts').update({ material_responsibility })` on save
  - Refreshes the contract list after save

### `src/pages/EditProject.tsx`
- Add a brief explanatory note under the Material Responsibility toggle (same as wizard enhancement) for consistency

## Technical Details

### Contract Data

The `project_contracts` table already has a `material_responsibility` column (text, nullable). Values are 'GC' or 'TC'. It is only relevant when a Trade Contractor is involved (either `from_role` or `to_role` is 'Trade Contractor').

### Permission Gating

The inline reassignment button on the overview will use the existing `usePermission('canInviteMembers')` check, which is already used for the "Manage" link on contracts. Only GC_PM and TC_PM roles have this permission.

### Reassignment Flow

```text
User clicks edit icon on Material Responsibility badge
  -> Popover opens with GC/TC toggle
  -> User selects new value
  -> User clicks Save
  -> UPDATE project_contracts SET material_responsibility = ? WHERE id = ?
  -> Toast: "Material responsibility updated"
  -> Contract list refreshes
```

Note: This only updates the contract record. The `pricing_owner_org_id` on individual POs is set when POs are created based on this value. Existing POs will not retroactively change -- only new POs going forward will use the updated setting.
