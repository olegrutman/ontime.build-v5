

# Split "Invoices Paid" KPI into "Paid by You" and "Paid to You"

## Overview
Replace the single "Invoices Paid" KPI card with two separate cards: one showing invoices you've paid out and one showing invoices paid to you. The grid expands from 4 to 5 columns.

## Changes

### 1. `src/hooks/useDashboardData.ts`
Add two new fields to the `financials` state:
- **`paidByYou`**: PAID invoices where your org is `to_org_id` (contract) or `pricing_owner_org_id` (PO) — money you paid out
- **`paidToYou`**: PAID invoices where your org is `from_org_id` (contract) or `supplier_org_id` (PO) — money you received

Compute these for all three roles (TC, GC, FC) alongside the existing `totalBilled` calculation.

### 2. `src/components/dashboard/DashboardKPIRow.tsx`
- Update `DashboardKPIRowProps` to include `paidByYou` and `paidToYou` in `financials`
- Replace the single "Invoices Paid" `KPICard` with two cards:
  - **"Paid by You"** — red-tinted tag, shows outgoing payments
  - **"Paid to You"** — green-tinted tag, shows incoming payments
- Change grid from `lg:grid-cols-4` to `lg:grid-cols-5`

### 3. `src/pages/Dashboard.tsx`
No changes needed — it already passes the full `financials` object.

