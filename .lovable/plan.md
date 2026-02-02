
# Plan: Remove Old Inventory Page and Update Supplier RLS Policies

## Overview

This plan removes the legacy inventory browsing page (`/inventory`) which was designed for general material searching, and updates the database security rules so that Suppliers can properly manage their own product catalogs through the new Supplier Inventory page (`/supplier/inventory`).

---

## What's Being Removed

### Files to Delete
| File | Purpose |
|------|---------|
| `src/pages/InventoryPage.tsx` | Old inventory search page |
| `src/hooks/useInventory.ts` | Hook for inventory search/filtering |
| `src/hooks/useInventoryOrder.ts` | Hook for adding items to orders |
| `src/types/inventory.ts` | Types for inventory items/filters |
| `src/components/inventory/InventoryFilterDrawer.tsx` | Filter drawer component |
| `src/components/inventory/InventoryProductRow.tsx` | Product row component |
| `src/components/inventory/InventoryProductDetail.tsx` | Product detail sheet |
| `src/components/inventory/InventoryEmptyState.tsx` | Empty state component |
| `src/components/inventory/InventoryPresets.tsx` | Category presets component |
| `src/components/inventory/index.ts` | Barrel export file |

### Routes to Remove
- `/inventory` route from `App.tsx`

### Sidebar Updates
- Remove "Inventory" link from the Materials section

---

## Database Security Updates

### Current Problem
The `catalog_items` table RLS policies only allow users with `GC_PM` role to INSERT, UPDATE, and DELETE items. This means Suppliers cannot manage their own product catalog even though we have a dedicated page for them.

### New RLS Policies for `catalog_items`

**Policy 1: Suppliers can manage their own catalog items**
- Allows INSERT, UPDATE, DELETE for users who belong to a SUPPLIER organization
- Validates that the catalog item's supplier is linked to the user's organization

**Policy 2: Project participants can view catalog items**
- Allows SELECT for authenticated users who are participants in projects where the supplier is also a participant
- This enables GC/TC users to see supplier catalogs when ordering materials

### Migration SQL Summary

```sql
-- Drop old restrictive GC_PM-only policies
DROP POLICY IF EXISTS "GC_PM can insert catalog items" ON catalog_items;
DROP POLICY IF EXISTS "GC_PM can update catalog items" ON catalog_items;
DROP POLICY IF EXISTS "GC_PM can delete catalog items" ON catalog_items;

-- New: Suppliers can manage their own catalog
CREATE POLICY "Suppliers can manage own catalog items"
ON catalog_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM suppliers s
    JOIN organizations o ON o.id = s.organization_id
    JOIN user_org_roles uor ON uor.organization_id = o.id
    WHERE s.id = catalog_items.supplier_id
    AND uor.user_id = auth.uid()
    AND o.type = 'SUPPLIER'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM suppliers s
    JOIN organizations o ON o.id = s.organization_id
    JOIN user_org_roles uor ON uor.organization_id = o.id
    WHERE s.id = catalog_items.supplier_id
    AND uor.user_id = auth.uid()
    AND o.type = 'SUPPLIER'
  )
);

-- Broader read access for project participants
CREATE POLICY "Project participants can view supplier catalogs"
ON catalog_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = catalog_items.supplier_id
  )
);
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/App.tsx` | Modify | Remove `/inventory` route and InventoryPage import |
| `src/components/layout/AppSidebar.tsx` | Modify | Remove "Inventory" from materialsNavItems |
| `src/pages/InventoryPage.tsx` | Delete | Remove old inventory page |
| `src/hooks/useInventory.ts` | Delete | Remove inventory search hook |
| `src/hooks/useInventoryOrder.ts` | Delete | Remove inventory order hook |
| `src/types/inventory.ts` | Delete | Remove inventory types |
| `src/components/inventory/*` | Delete | Remove all inventory components (6 files) |
| Database Migration | Create | Update RLS policies for catalog_items |

---

## Result After Changes

1. **Suppliers**: Can upload and manage their product catalog via `/supplier/inventory`
2. **GC/TC/FC**: Can view supplier catalogs when browsing materials for orders
3. **Navigation**: The Materials section will show Product Catalog, Material Orders, Purchase Orders, and Project Estimates (no longer "Inventory")
4. **Cleaner Architecture**: Supplier-specific functionality is contained in the Supplier section
