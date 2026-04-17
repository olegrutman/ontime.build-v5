
## Plan: Refactor SupplierDashboardView to use useSupplierDashboardData

Switch `SupplierDashboardView` to consume the supplier-aware hook so the 6 KPI cards display real data.

### Changes

**1. `src/pages/Dashboard.tsx`**
- For `SUPPLIER` org type, call `useSupplierDashboardData()` instead of (or in addition to) `useDashboardData()`.
- Pass supplier-shaped data to `SupplierDashboardView`.

**2. `src/components/dashboard/SupplierDashboardView.tsx`**
- Update props interface to accept supplier hook output: `estimates[]`, `purchaseOrders[]`, `invoices[]`, `payments[]`, `projects[]`.
- Replace `projectFinancials` derivation with supplier-side aggregation per project:
  - **estimate** = sum of `supplier_estimates.total_amount` where `status='APPROVED'` for that project
  - **ordered** = sum of `purchase_orders.total_amount` where `status != 'DRAFT'` for that project
  - **billed** = sum of `invoices.total_amount` where `status IN ('SUBMITTED','APPROVED','PAID')` for that project
  - **received** = sum of `invoices.total_amount` where `status='PAID'` (or sum of payments) for that project
  - **overBy** = max(0, ordered − estimate)
- Compute **Days Since Last Payment** per project from `payments.payment_date` max.
- Wire **Scheduled Deliveries** panel to POs with `ready_for_delivery_at` or `expected_delivery_date` in the future.
- Map `project_type` enum → human label via existing label map (or add small inline map).
- Broaden Active Projects filter to include projects with any estimate, PO, or invoice activity (not just `estimate > 0`).
- Add navigation handlers to KPI cards 2–6 rows (drill into project).

**3. Keep unchanged**
- `useDashboardData.ts` (other roles continue using it)
- All other dashboard views
- Permissions, RLS, schema

### Files modified
- `src/pages/Dashboard.tsx`
- `src/components/dashboard/SupplierDashboardView.tsx`

### Files NOT touched
- `useDashboardData.ts`, `useSupplierDashboardData.ts` (already correct)
- Sidebar, routing, permissions

### Verification after implementation
- KPI cards show non-zero values when supplier has estimates/POs/invoices
- Days Since Last Pmt shows real days (not hard-coded `[8,3,12]`)
- Scheduled Deliveries lists upcoming PO deliveries
- Phase column shows readable labels
- Drill-down navigation works from each row
