
# Add Product & Search/Edit to Supplier Inventory Page

## What Changes

The Supplier Inventory page currently only supports bulk CSV/Excel upload. We'll add three new capabilities:

1. **Add Single Product** -- A dialog form to manually add one product at a time
2. **Search/Filter Catalog** -- A search bar + category filter to find products in their catalog
3. **Edit Product** -- Click a row to open an edit dialog, update fields, and save

## New Component: `AddProductDialog`

A dialog with a form containing:
- SKU (required, text)
- Name (text)
- Description (required, text)
- Category (required, select from `CATALOG_CATEGORIES`)
- Secondary Category (text)
- Manufacturer (text)
- Dimension, Thickness, Length, Color, Wood Species (text fields)
- Bundle Type (text), Bundle Qty (number)
- UOM (required, select from `UOM_OPTIONS`)

On submit: insert into `catalog_items` via Supabase, then refresh the list.

## New Component: `EditProductDialog`

Same form as Add, but pre-populated with the selected item's data. On submit: update the row in `catalog_items` by `id`, then refresh.

## Changes to `src/pages/SupplierInventory.tsx`

1. **Add search bar and category filter** above the catalog table:
   - Text input for searching by SKU/name/description (client-side filter on loaded items)
   - Category chip/select filter
   - These filter the displayed `items` array

2. **Add "+ Add Product" button** next to the Upload button in the header. Opens `AddProductDialog`.

3. **Make table rows clickable** -- clicking a row opens `EditProductDialog` with that item's data.

4. **Add a Delete button** inside the edit dialog to remove a product.

5. **Remove the 100-item display cap** -- replace with the filtered results (still paginated or virtualized if needed, but search makes the cap less necessary). We'll keep a reasonable limit (e.g., 200) with a "load more" or note.

6. **Use `AppLayout`** instead of manual sidebar scaffolding (consistency fix, same as RFI page).

## File Structure

```text
src/components/supplier-inventory/AddProductDialog.tsx    (NEW)
src/components/supplier-inventory/EditProductDialog.tsx   (NEW)
src/pages/SupplierInventory.tsx                           (MODIFIED)
```

## Technical Details

- **Add/Edit forms** use controlled state with `useState` for each field. Validation: SKU and Description required, category required.
- **Search**: local filtering with `items.filter(...)` matching query against `supplier_sku`, `name`, `description`, `manufacturer` (case-insensitive). Category filter checks exact match.
- **Insert**: `supabase.from('catalog_items').insert({...})` with the supplier_id from `ensureSupplierRecord`.
- **Update**: `supabase.from('catalog_items').update({...}).eq('id', item.id)`.
- **Delete**: `supabase.from('catalog_items').delete().eq('id', item.id)` with confirmation.
- Both dialogs share a similar form layout; we can use a shared `ProductForm` sub-component internally or keep them separate for simplicity.
- The page layout will switch to `AppLayout` for mobile consistency.
