

# Wire PO Product Picker into CO Materials Panel

## Overview
Replace the manual text-input "Add row" flow in `COMaterialsPanel` with the existing `ProductPickerContent` from the PO wizard. When a TC clicks "Add material", a sheet/dialog opens with the full catalog browser (category → secondary → filter → product → quantity), and the selected product is converted into a `co_material_items` row.

## Key challenge
`ProductPickerContent` requires a `supplierId` (from the `suppliers` table). The CO detail page doesn't currently know this. We need to look up the project's designated supplier via `project_designated_suppliers` → find the supplier org → find the `suppliers.id`.

## Changes

### 1. `COMaterialsPanel.tsx` — Major rework
- Add `projectId` prop (already available in CODetailPage)
- Add state: `pickerOpen` boolean, `supplierId` string | null
- On mount (if `isTC`), fetch the supplier for this project:
  ```
  project_designated_suppliers(project_id) → user_id → profiles(user_id) → org_id
  → suppliers(organization_id) → suppliers.id
  ```
  Or simpler: query `project_participants` where role='Supplier' to get org_id, then look up `suppliers.organization_id`.
- Replace the "Add row" / "Add material" buttons to open a Sheet containing `ProductPickerContent`
- When ProductPicker calls `onAddItem(POWizardV2LineItem)`, convert the PO line item to a CO material insert:
  - `description` = item.name
  - `supplier_sku` = item.supplier_sku
  - `quantity` = item.quantity
  - `uom` = item.uom
  - `unit_cost` = item.unit_price (if available)
  - Insert directly into `co_material_items`, then close picker and refresh
- Keep the existing manual "Add row" as a fallback button ("Add custom item") for cases where the item isn't in the catalog
- Keep existing saved-rows display table and delete functionality unchanged

### 2. `CODetailPage.tsx` — Pass projectId
- Add `projectId={projectId!}` to the `<COMaterialsPanel>` props

### 3. No new files needed
Reuse `ProductPickerContent`, `CategoryGrid`, `SecondaryCategoryList`, `StepByStepFilter`, `ProductList`, `QuantityPanel` as-is.

## Supplier lookup approach
Query chain in COMaterialsPanel on mount:
1. `project_participants` where `project_id` and `role = 'Supplier'` → get `organization_id`
2. `suppliers` where `organization_id` matches → get `suppliers.id`
3. Pass to `ProductPickerContent` as `supplierId`

If no supplier found, the picker button is hidden and only manual entry remains.

## UI flow for TC
1. TC clicks "Add from catalog" button → Sheet opens with ProductPickerContent
2. TC browses categories → filters → selects product → sets quantity
3. On "Add to PO" (button text will say "Add to CO" — we can customize via the QuantityPanel or just convert on callback)
4. Item is inserted into `co_material_items` and sheet closes
5. Manual "Add custom row" button remains for items not in catalog

