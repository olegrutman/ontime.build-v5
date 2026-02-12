

# Move Financial Snapshot from Dashboard to Its Own Page

UI/layout only. No logic, permissions, or database changes.

## What happens

### 1. New page: `src/pages/Financials.tsx`
- A new page that uses `AppLayout` (same as Dashboard)
- Renders the existing `DashboardFinancialCard` component full-width with the same data from `useDashboardData()`
- Hidden for Supplier orgs (same rule as on dashboard today)

### 2. Remove Financial Snapshot from Dashboard (`src/pages/Dashboard.tsx`)
- Delete the `DashboardFinancialCard` block (lines 258-273) from the dashboard sidebar
- Remove the `DashboardFinancialCard` import
- The `financials` and `billing` data from `useDashboardData` will still be fetched (used by the new page, not the dashboard)

### 3. Add sidebar link (`src/components/layout/AppSidebar.tsx`)
- Add a "Financials" item to `mainNavItems` with the `DollarSign` icon and url `/financials`
- Hidden for Supplier orgs (same visibility rule)
- Shows as icon-only when sidebar is collapsed, with tooltip

### 4. Register route (`src/App.tsx`)
- Add `<Route path="/financials" element={<Financials />} />` alongside existing routes

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Financials.tsx` | New page -- renders DashboardFinancialCard full-width |
| `src/pages/Dashboard.tsx` | Remove DashboardFinancialCard from Zone B sidebar |
| `src/components/layout/AppSidebar.tsx` | Add "Financials" nav item (hidden for suppliers) |
| `src/App.tsx` | Add /financials route |

## What Is NOT Changed
- No database, logic, permissions, or hook changes
- `useDashboardData` hook unchanged -- the new page calls it independently
- RemindersTile stays on Dashboard
- All other sidebar items unchanged
