
# Sort POs by Status Priority and Enable Edit-to-Wizard Flow

## 1. Sort POs by Status (Most Attention First)

**File: `src/components/project/PurchaseOrdersTab.tsx`**

Add a status priority map and sort `filteredPOs` before rendering. The priority order (highest attention first):

1. SUBMITTED (needs pricing from supplier)
2. PRICED (needs finalization or ordering)
3. ACTIVE (draft, needs items or submission)
4. FINALIZED (approved, pending order)
5. ORDERED (in progress)
6. READY_FOR_DELIVERY (awaiting delivery)
7. DELIVERED (complete)

Sort by this priority, then by `created_at` descending within the same status.

## 2. Edit Button Opens Wizard with Existing Items

**File: `src/components/project/PurchaseOrdersTab.tsx`**

Currently the `onEdit` handler on `POCard` just navigates to `PODetail`. Change it to:

- Add new state: `editingPO` (holds the PO being edited) and `editWizardOpen`
- When Edit is clicked, fetch the PO's line items from `po_line_items`, map them to `POWizardV2LineItem` format, and open the wizard pre-populated
- On wizard complete: delete old `po_line_items` for the PO, insert new ones, update PO metadata (notes, delivery date), then refresh the list

**File: `src/components/po-wizard-v2/POWizardV2.tsx`**

Add optional props for edit mode:
- `initialData?: Partial<POWizardV2Data>` -- pre-fills the wizard with existing items
- `editMode?: boolean` -- skips the header screen (supplier/project already set) and goes straight to the items screen
- When `initialData` is provided with `line_items`, the wizard opens on the Items screen so users can immediately add/remove products

**File: `src/components/po-wizard-v2/ItemsScreen.tsx`** (if needed)

No changes expected; the existing add/remove/edit item flows already work. The wizard just needs to be pre-seeded with data.

## Technical Details

### Status Priority Map
```typescript
const STATUS_PRIORITY: Record<POStatus, number> = {
  SUBMITTED: 0,
  PRICED: 1,
  ACTIVE: 2,
  FINALIZED: 3,
  ORDERED: 4,
  READY_FOR_DELIVERY: 5,
  DELIVERED: 6,
};
```

### Edit Flow Data Mapping
When editing, `po_line_items` rows are mapped to `POWizardV2LineItem`:
- `catalog_item_id` from the line item's linked catalog item (may be empty for unmatched items)
- `supplier_sku`, `description` (as `name`), `quantity`, `uom` mapped directly
- `id` gets a new client-side UUID for the wizard's internal tracking
- `specs` built from available dimension/length data
- `unit_mode` defaults to `'EACH'`

### Save Flow for Edits
1. Delete all existing `po_line_items` where `po_id = editingPO.id`
2. Insert new line items from wizard data
3. Update PO record with any changed notes
4. Refresh PO list

### Files Modified
- `src/components/project/PurchaseOrdersTab.tsx` -- sorting + edit handler
- `src/components/po-wizard-v2/POWizardV2.tsx` -- accept initialData/editMode props
