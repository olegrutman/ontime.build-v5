
# Plan: Add Purchase Orders Tab, Supplier Inventory Upload, and Supplier Estimate Upload

## Overview

This plan addresses three requirements:
1. Add a "Purchase Orders" tab to the Project Overview page for all users
2. Restrict inventory upload functionality to Suppliers only
3. Create a dedicated page for Suppliers to upload project estimates

---

## 1. Add Purchase Orders Tab to Project Overview

### Changes to `src/components/project/ProjectTopBar.tsx`
- Add a new "POs" tab trigger between "Invoices" and "Documents"

### Changes to `src/pages/ProjectHome.tsx`
- Import and render a new `PurchaseOrdersTab` component
- Add handling for `activeTab === 'purchase-orders'`

### New Component: `src/components/project/PurchaseOrdersTab.tsx`
Create a project-scoped Purchase Orders tab that:
- Fetches POs linked to the current project
- Shows role-appropriate views:
  - **GC/TC**: See all project POs, can create new POs
  - **Supplier**: See POs sent to them for this project (read-only view of materials requested)
- Displays PO list with status badges (Draft, Sent)
- Allows creating new POs linked to this project
- Shows PO details in a side panel

---

## 2. Restrict Inventory Upload to Suppliers Only

### Changes to `src/pages/AdminSuppliers.tsx`
- Rename/repurpose to become a generic supplier management page
- Currently restricted to `GC_PM` role - need to separate concerns

### New Page: `src/pages/SupplierInventory.tsx`
Create a Supplier-only inventory management page that:
- Only accessible by users with `SUPPLIER` role
- Allows Suppliers to:
  - View their own catalog items
  - Upload CSV to add/update their inventory
  - Manage their product catalog
- Redirects non-Supplier users with an access denied message

### Changes to `src/App.tsx`
- Add route `/supplier/inventory` for the new page

### Changes to `src/components/layout/AppSidebar.tsx`
- Show "My Inventory" link only for Supplier users

---

## 3. Create Supplier Project Estimate Upload Page

### New Page: `src/pages/SupplierProjectEstimates.tsx`
Create a dedicated page for Suppliers to upload project-specific estimates:
- Only accessible by users with `SUPPLIER` role
- Features:
  - Select a project (from projects where they are a participant)
  - Upload CSV containing material estimates with pricing
  - View/edit draft estimates before submitting
  - Submit estimates for TC/GC review
- CSV format supports: SKU, Description, Quantity, UOM, Unit Price, Notes

### New Types: `src/types/supplierEstimate.ts`
```typescript
export interface SupplierProjectEstimate {
  id: string;
  supplier_org_id: string;
  project_id: string;
  work_order_id?: string;
  name: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  total_amount: number;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierEstimateItem {
  id: string;
  estimate_id: string;
  supplier_sku?: string;
  description: string;
  quantity: number;
  uom: string;
  unit_price: number;
  line_total: number;
  notes?: string;
}
```

### Database Migration
Create new tables for supplier-submitted estimates:
- `supplier_estimates` - Header table for estimates
- `supplier_estimate_items` - Line items with pricing

### Changes to `src/App.tsx`
- Add route `/supplier/estimates` for the new page

### Changes to `src/components/layout/AppSidebar.tsx`
- Show "My Estimates" link only for Supplier users

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/project/ProjectTopBar.tsx` | Modify | Add "POs" tab trigger |
| `src/pages/ProjectHome.tsx` | Modify | Add purchase-orders tab content |
| `src/components/project/PurchaseOrdersTab.tsx` | Create | New project-level PO tab component |
| `src/components/project/index.ts` | Modify | Export PurchaseOrdersTab |
| `src/pages/SupplierInventory.tsx` | Create | Supplier-only inventory upload page |
| `src/pages/SupplierProjectEstimates.tsx` | Create | Supplier estimate upload page |
| `src/types/supplierEstimate.ts` | Create | Types for supplier estimates |
| `src/App.tsx` | Modify | Add new routes |
| `src/components/layout/AppSidebar.tsx` | Modify | Add conditional menu items for Suppliers |

### Database Migration
```sql
-- Supplier estimates table
CREATE TABLE supplier_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_org_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  work_order_id UUID REFERENCES change_order_projects(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  total_amount NUMERIC(12,2) DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier estimate line items
CREATE TABLE supplier_estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES supplier_estimates(id) ON DELETE CASCADE,
  supplier_sku TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
  uom TEXT NOT NULL DEFAULT 'EA',
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE supplier_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_estimate_items ENABLE ROW LEVEL SECURITY;

-- Supplier can manage their own estimates
CREATE POLICY "Suppliers manage own estimates" ON supplier_estimates
  FOR ALL USING (
    supplier_org_id IN (
      SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
  );

-- Project team members can view estimates
CREATE POLICY "Project team can view estimates" ON supplier_estimates
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_participants 
      WHERE organization_id IN (
        SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
      )
    )
  );

-- Similar policies for estimate items
CREATE POLICY "Access estimate items via estimate" ON supplier_estimate_items
  FOR ALL USING (
    estimate_id IN (SELECT id FROM supplier_estimates)
  );
```

---

## Technical Details

### Purchase Orders Tab Component Structure
```
PurchaseOrdersTab
├── Header with stats (count, total value)
├── Filter controls (status filter)
├── Create PO button (for GC/TC only)
├── PO list (cards or table)
└── PO Detail sheet (on click)
```

### Supplier Inventory Page Structure
```
SupplierInventory
├── Header ("My Product Catalog")
├── Upload CSV button
├── CSV Preview dialog
├── Catalog items table
│   ├── SKU, Category, Description, UOM
│   └── Edit/Delete actions
└── Empty state with upload prompt
```

### Supplier Estimates Page Structure
```
SupplierProjectEstimates
├── Header ("Project Estimates")
├── Project selector dropdown
├── Estimates list (by project)
│   ├── Draft estimates (editable)
│   └── Submitted estimates (view-only)
├── Create new estimate dialog
│   ├── Name, Project, Work Order (optional)
│   └── CSV upload or manual entry
└── Estimate detail view
    ├── Line items table
    ├── Add/edit items
    └── Submit for approval button
```

---

## User Flow

### Supplier Inventory Upload
1. Supplier logs in and sees "My Inventory" in sidebar
2. Opens inventory page, sees their current catalog
3. Clicks "Upload CSV" to import products
4. Reviews preview, confirms import
5. Items appear in their catalog

### Supplier Project Estimate
1. Supplier is added to a project as participant
2. They navigate to "My Estimates" from sidebar
3. Select the project from dropdown
4. Create new estimate (name it, optionally link to work order)
5. Upload CSV with pricing or add items manually
6. Review totals, add notes
7. Submit for TC/GC review
8. TC/GC approves/rejects from their view

### TC/GC Viewing Purchase Orders
1. Open project, click "POs" tab
2. See all POs for this project
3. Create new PO (select supplier, link to work order)
4. Send PO to supplier
5. Track PO status
