# Plan: Remove Old Inventory Page and Update Supplier RLS Policies

## Status: ✅ COMPLETED

---

## Changes Made

### Files Deleted
- `src/pages/InventoryPage.tsx`
- `src/hooks/useInventory.ts`
- `src/hooks/useInventoryOrder.ts`
- `src/types/inventory.ts`
- `src/components/inventory/InventoryFilterDrawer.tsx`
- `src/components/inventory/InventoryProductRow.tsx`
- `src/components/inventory/InventoryProductDetail.tsx`
- `src/components/inventory/InventoryEmptyState.tsx`
- `src/components/inventory/InventoryPresets.tsx`
- `src/components/inventory/index.ts`

### Routes Removed
- `/inventory` route removed from `App.tsx`

### Sidebar Updates
- Removed "Inventory" link from the Materials section in `AppSidebar.tsx`

### Database RLS Updates (Migration Applied)
- Dropped old `GC_PM` restrictive policies on `catalog_items`
- Created new policy: **Suppliers can manage own catalog items** - allows suppliers to INSERT/UPDATE/DELETE their own catalog items
- Created new policy: **Authenticated users can view supplier catalogs** - allows all authenticated users to view catalog items

---

## Result

1. **Suppliers**: Can upload and manage their product catalog via `/supplier/inventory`
2. **GC/TC/FC**: Can view supplier catalogs when browsing materials for orders
3. **Navigation**: The Materials section now shows Product Catalog, Material Orders, Purchase Orders, and Project Estimates (no longer "Inventory")
4. **Cleaner Architecture**: Supplier-specific functionality is contained in the Supplier section
