
# Add Operational Tiles to Supplier Project Overview

## Goal
Add the same type of operational summary tiles that GC/TC users see (Team, Invoices, RFIs, Scope) to the Supplier project overview, in addition to the existing financial cards.

## Changes

### 1. Create `src/components/project/SupplierOperationalSummary.tsx` (new file)
A supplier-specific version of the OperationalSummary component that shows:

- **Recent Invoices** tile -- fetches invoices linked to the supplier's POs on this project, shows invoice number, status badge, and amount. Clicking navigates to the Invoices tab.
- **Open RFIs** tile -- counts RFIs assigned to the supplier's org (`assigned_to_org_id = supplierOrgId`). Clicking navigates to the RFIs tab.
- **Team** tile -- fetches `project_team` for this project and displays team members grouped by role (same as GC view).
- **Project Scope** tile -- fetches `project_scope_details` and shows the scope summary (same as GC view).

The layout will follow the same pattern as the existing `OperationalSummary`: a 2-column grid with RFIs spanning full width.

Props: `projectId`, `supplierOrgId`, `onNavigate`

### 2. Update `src/pages/ProjectHome.tsx` (supplier overview section, lines 224-237)
Import and render `SupplierOperationalSummary` below the existing financial cards grid:

```
// After the financial cards grid:
<SupplierOperationalSummary
  projectId={id!}
  supplierOrgId={supplierOrgId}
  onNavigate={handleTabChange}
/>
```

### 3. Enable RFIs tab for suppliers in `src/pages/ProjectHome.tsx`
Currently the RFIs tab is gated by `!isSupplier` (line ~279). Remove that restriction so suppliers can view and answer RFIs assigned to them.

### 4. Add RFIs tab to supplier navigation in `src/components/project/ProjectTopBar.tsx`
Currently the RFIs tab trigger is wrapped in `{!isSupplier && ...}` (lines 165-173). Remove that condition so suppliers see the RFIs tab in the top bar.

## Technical Details

### SupplierOperationalSummary data fetching
- **Invoices**: Query `invoices` table joined through `purchase_orders` where `supplier_id` matches, limited to 5 most recent
- **RFIs**: Count query on `project_rfis` where `project_id` matches and `assigned_to_org_id = supplierOrgId` and `status = 'OPEN'`
- **Team**: Same query as GC OperationalSummary -- `project_team` filtered by `project_id`
- **Scope**: Same query as GC OperationalSummary -- `project_scope_details` filtered by `project_id`

### Component structure
Follows the same visual pattern as `OperationalSummary`:
- Each tile is a `div` with `border bg-card p-3` styling
- Section headers use `text-[11px] uppercase tracking-wide text-muted-foreground font-medium`
- Grid layout: `grid grid-cols-1 sm:grid-cols-2 gap-3`
- RFI tile spans full width: `sm:col-span-2`

### Files changed
1. `src/components/project/SupplierOperationalSummary.tsx` -- new file
2. `src/pages/ProjectHome.tsx` -- import + render the new component, ungated RFIs tab
3. `src/components/project/ProjectTopBar.tsx` -- show RFIs tab for suppliers
4. `src/components/project/index.ts` -- export new component
