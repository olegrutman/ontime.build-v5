

# Platform Projects — List Page + Enhanced Detail Page

## Problem
The "Projects" tile on the Platform Dashboard links to `/platform/projects` but no list page exists at that route. The detail page (`/platform/projects/:projectId`) exists but only shows basic counts and team — no financial or operational depth.

## What to Build

### 1. New Page: `src/pages/platform/PlatformProjects.tsx`
A searchable, paginated project list (same pattern as PlatformUsers/PlatformOrgs):
- **Columns**: Name, Owner Org, Status, City/State, Created, WOs, POs, Invoices
- **Search**: filter by project name (ilike)
- **Status filter**: dropdown for setup/active/on_hold/completed/archived
- **Pagination**: 25 per page
- **Click row** → navigate to `/platform/projects/:id`

Register route in `App.tsx` at `/platform/projects`.

### 2. Enhanced: `src/pages/platform/PlatformProjectDetail.tsx`
Expand the existing detail page with real business data:

**Summary Card** (already exists, expand it):
- Add: City/State, Owner Org name (linked to `/platform/orgs/:id`), Build Type, Start Date, Created By org

**Financial Overview Card** (new):
- Total Contract Value — sum of `project_contracts.contract_sum`
- Total Invoiced — sum of `invoices.total_amount`
- Total Paid — sum of `invoices.total_amount` where `paid_at IS NOT NULL`
- Total PO Value — sum of `purchase_orders.po_total`
- Outstanding — Invoiced minus Paid
- Retainage Held — sum of `invoices.retainage_amount`

**Activity Counts Card** (new, replaces bare counts in summary):
- WOs by status breakdown (e.g., 3 approved, 1 pending, 2 draft)
- POs by status breakdown (DRAFT, SENT, ORDERED, DELIVERED, etc.)
- Invoices by status breakdown (draft, submitted, approved, paid, rejected)

**Contracts Table** (new):
- List `project_contracts` for this project: From Org → To Org, Role, Contract Sum, Labor Budget, Status, Trade
- Click row → navigate to org detail

**Recent Invoices Table** (new, last 10):
- Invoice #, Status, Total Amount, Billing Period, Created date
- Sortable by date

**Recent Purchase Orders Table** (new, last 10):
- PO #, Status, PO Total, Supplier org name, Created date

### 3. No Database Changes
All data already exists in tables the platform user has SELECT access to. Just query and display.

### 4. Files to Create/Edit
- **Create**: `src/pages/platform/PlatformProjects.tsx`
- **Edit**: `src/pages/platform/PlatformProjectDetail.tsx` — add financial and activity sections
- **Edit**: `src/App.tsx` — add route for `/platform/projects`

