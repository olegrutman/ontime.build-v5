

# Fix Broken Links on Supplier Dashboard

## The Problem

The supplier dashboard generates URLs that don't match any route in `App.tsx`. The console logs confirm 404s. Here's every broken pattern:

| Component | URL generated | Why it's broken |
|-----------|--------------|-----------------|
| **SupplierActionQueue** | `/project/:id/materials/purchase-orders/:poId` | No such route exists |
| **SupplierActionQueue** | `/project/:id/invoicing` | No such route exists |
| **SupplierActionQueue** | `/project/:id/returns/:returnId` | No such route exists |
| **SupplierOpenOrders** | `/project/:id/materials/purchase-orders/:poId` | Same — no nested project routes |
| **SupplierEstimateCatalog** | `/project/:id/estimates` | No such route — estimates live at `/estimates` or `/supplier/estimates` |
| **SupplierReturnsQueue** | `/project/:id/returns/:returnId` | No such route |

The app only has `/project/:id` (ProjectHome) and `/project/:id/edit`. There are no sub-routes under `/project/:id/` for materials, invoicing, returns, or estimates. Those features live at top-level routes like `/purchase-orders`, `/estimates`, `/supplier/estimates`.

Additionally, the supplier has no way to navigate to a **project list** from the dashboard — there's no "View All Projects" link anywhere.

## The Fix

### 1. Fix all navigation URLs in the data hook (`useSupplierDashboardData.ts`)
Replace broken `actionUrl` values in the action queue builder:
- PO confirmation actions: `/purchase-orders` (the top-level PO list page)
- Overdue invoice actions: `/invoices` (if that route exists) or `/dashboard` as fallback
- Return actions: `/returns` or `/dashboard`
- Delivery scheduling actions: `/purchase-orders`

### 2. Fix direct navigation in components
- **SupplierOpenOrders**: Change `navigate(/project/.../materials/purchase-orders/...)` → `navigate(/purchase-orders)` 
- **SupplierEstimateCatalog**: Change `navigate(/project/.../estimates)` → `navigate(/supplier/estimates)` or `/estimates`
- **SupplierReturnsQueue**: Change `navigate(/project/.../returns/...)` → whatever the correct returns route is

### 3. Check which top-level routes actually exist
Need to verify these routes exist: `/invoices`, `/returns`, `/purchase-orders`. If any are missing, fall back to `/project/:id` (the project home page) which does exist.

### 4. Add "View Projects" link
Add a simple link to `/dashboard` sidebar or the supplier dashboard header that navigates to a projects listing. Or add a "View Project" action on the Project Health rows that goes to `/project/:projectId`.

## Files to Change
- `src/hooks/useSupplierDashboardData.ts` — fix all `actionUrl` values
- `src/components/dashboard/supplier/SupplierOpenOrders.tsx` — fix navigate URL
- `src/components/dashboard/supplier/SupplierEstimateCatalog.tsx` — fix navigate URL
- `src/components/dashboard/supplier/SupplierReturnsQueue.tsx` — fix navigate URL
- `src/components/dashboard/supplier/SupplierProjectHealth.tsx` — make project names clickable to `/project/:id`

