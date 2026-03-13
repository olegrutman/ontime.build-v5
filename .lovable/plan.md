

# Supplier Dashboard Bugs -- Analysis & Fix Plan

## Bugs Found (Plain English)

### Bug 1: No way to see or click into projects
The Supplier Dashboard has no "Projects" section at all. Unlike the regular dashboard which has a project list you can click, the supplier dashboard only shows project names as small text inside other cards (like POs, returns, estimates). There is no clickable list of projects the supplier is part of.

### Bug 2: Action Queue items link to wrong pages
When a supplier clicks action items in the "Action Queue" section:
- **"Confirm PO"** goes to `/purchase-orders` -- this is a global PO list page, not the specific project's PO tab where they can actually confirm it.
- **"Schedule delivery"** also goes to `/purchase-orders` -- same problem.
- **"Follow Up" (overdue invoice)** goes to `/project/{id}` -- lands on the project home page, not the invoices tab.
- **"Respond" (return)** goes to `/project/{id}` -- lands on the project home page, not the returns tab.

### Bug 3: Other cards also have wrong links
- **Open Purchase Orders** card: every PO clicks to `/purchase-orders` (global page) instead of the specific project's PO tab.
- **Estimates** card: clicks to `/supplier/estimates` which exists but doesn't take you to the specific project context.
- **Returns** card: clicks to `/project/{id}` but doesn't navigate to the returns tab.

## Fix Plan

### 1. Add a Projects section to the Supplier Dashboard
**File:** `src/components/dashboard/SupplierDashboard.tsx`
- Add a new `SupplierProjectList` component (or reuse data from the hook) that shows accepted projects as clickable cards.
- Place it after the Action Queue section.
- Each project links to `/project/{id}`.

### 2. Fix Action Queue URLs
**File:** `src/hooks/useSupplierDashboardData.ts` (lines 247-301)
- "Confirm PO": change from `/purchase-orders` to `/project/${po.project_id}?tab=purchase-orders`
- "Follow Up" overdue invoice: change from `/project/${inv.project_id}` to `/project/${inv.project_id}?tab=invoices`
- "Respond" return: change from `/project/${r.project_id}` to `/project/${r.project_id}?tab=returns`
- "Schedule delivery": change from `/purchase-orders` to `/project/${po.project_id}?tab=purchase-orders`

### 3. Fix Open POs card links
**File:** `src/components/dashboard/supplier/SupplierOpenOrders.tsx` (line 34)
- Change from `navigate('/purchase-orders')` to `navigate('/project/${po.projectId}?tab=purchase-orders')`

### 4. Fix Estimates card links
**File:** `src/components/dashboard/supplier/SupplierEstimateCatalog.tsx` (line 37)
- Change from `navigate('/supplier/estimates')` to `navigate('/project/${est.projectId}?tab=estimates')` (or keep `/supplier/estimates` if that's the correct global view -- need to verify the tab name exists on the project page)

### 5. Fix Returns card links
**File:** `src/components/dashboard/supplier/SupplierReturnsQueue.tsx` (line ~57)
- Change from `navigate('/project/${ret.projectId}')` to `navigate('/project/${ret.projectId}?tab=returns')`

### 6. Fix Project Health card links
**File:** `src/components/dashboard/supplier/SupplierProjectHealth.tsx` (line 46)
- Already links to `/project/${row.projectId}` which is reasonable for a health overview -- keep as is.

### Files Changed
| File | Change |
|---|---|
| `src/hooks/useSupplierDashboardData.ts` | Fix 4 action URL patterns to include `?tab=` params |
| `src/components/dashboard/supplier/SupplierOpenOrders.tsx` | Fix navigate to project-specific PO tab |
| `src/components/dashboard/supplier/SupplierEstimateCatalog.tsx` | Fix navigate to project-specific estimates |
| `src/components/dashboard/supplier/SupplierReturnsQueue.tsx` | Fix navigate to project returns tab |
| `src/components/dashboard/SupplierDashboard.tsx` | Add a clickable project list section |

