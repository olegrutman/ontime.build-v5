

# Remove Financials & Work Orders Standalone Pages

## Summary
Delete the standalone `/financials` and `/change-orders` pages and remove them from all navigation. Work orders are already managed within each project's tab, and financials are handled at the project level.

## Changes

### 1. `src/components/layout/BottomNav.tsx`
- Remove `Financials` and `Work Orders` from `dashboardPrimaryItems`
- Update primary items to: Dashboard, Partners (+ move Reminders/RFIs from "More" into primary since we now have space)

### 2. `src/components/layout/AppSidebar.tsx`
- Remove `{ title: 'Financials', url: '/financials', icon: DollarSign }` from `mainNavItems`
- Remove the `DollarSign` import

### 3. `src/App.tsx`
- Remove the `/change-orders` and `/financials` route entries
- Remove the lazy imports for `ChangeOrders` and `Financials`

### 4. `src/components/Header.tsx`
- Remove the "Work Orders" dropdown menu item that navigates to `/change-orders`

### 5. `src/components/dashboard/DashboardQuickStats.tsx`
- Update the Work Orders stat click to navigate to `/dashboard` instead of `/change-orders`
- Update the Invoices stat click to navigate to `/dashboard` instead of `/financials`

### 6. `src/components/dashboard/NeedsAttentionTile.tsx`
- Change work order click handler to navigate to the project's work orders tab: `/project/{projectId}?tab=work-orders`

### 7. `src/components/dashboard/NeedsAttentionPanel.tsx`
- Same as above — navigate to project work orders tab instead of `/change-orders`

### 8. `src/components/dashboard/DashboardAttentionBanner.tsx`
- Same redirect update for work order clicks

### Files deleted: None (keep the page files in case they're useful for reference, but remove routes)
### Files modified: 8 files

No database changes needed.

