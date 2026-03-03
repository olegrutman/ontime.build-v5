

# Fix: Supplier Sees "Project Incomplete" Warning and SOV Tab

## Problem
Two issues affect the Supplier experience after project setup is completed:

1. **"Project Setup Incomplete" banner**: The `PurchaseOrdersTab`, `InvoicesTab`, and `WorkOrdersTab` check `projectStatus !== 'active'` to show a blocking warning. But the project status may still be `'setup'` from the creator's perspective even though the supplier should not be blocked. Suppliers don't control setup — they just need to price POs and manage estimates. The check doesn't account for the viewer's role.

2. **SOV tab visible to suppliers**: The desktop `ProjectTopBar` correctly hides the SOV tab for suppliers (`!isSupplier` guard at line 146). However, the **mobile `BottomNav`** has no role-awareness — it shows SOV in the "More" drawer for all users, including suppliers. Suppliers have no SOV and never will.

## Changes

### 1. `src/components/project/PurchaseOrdersTab.tsx` (~line 488)
Pass `isSupplier` or viewer role info so the "Project Setup Incomplete" banner is skipped for suppliers. Simplest fix: the component already receives `projectStatus` — change the blocking condition to also require the viewer is not a supplier. Since this component doesn't currently know the viewer role, we need to either:
- Add an `isSupplier` prop, or
- Only show the banner when status is specifically `'draft'` or `'setup'` AND the viewer is not a supplier

Since the parent `ProjectHome` already knows `isSupplier`, pass it as a prop and skip the banner when `isSupplier === true`.

### 2. `src/components/invoices/InvoicesTab.tsx` (~lines 524, 623)
Same fix — accept `isSupplier` prop and skip the "Project Setup Incomplete" banner for suppliers.

### 3. `src/components/layout/BottomNav.tsx` (~lines 53-65)
Filter out the SOV and Work Orders tabs for suppliers, same as the desktop TopBar does. The `BottomNav` needs access to the current org type. Options:
- Use `useAuth()` (already imported) to get `userOrgRoles` and check org type
- Filter `primaryProjectItems` and `moreProjectItems` based on whether the user is a supplier

Concrete change: Read `userOrgRoles` from `useAuth()`, determine `isSupplier`, then filter out `'sov'` and `'work-orders'` tabs from the mobile nav items when supplier.

### 4. `src/pages/ProjectHome.tsx` (~lines 363-369)
Pass `isSupplier` to `PurchaseOrdersTab` and `InvoicesTab` so they can conditionally hide the banner.

**4 files modified. No database changes.**
