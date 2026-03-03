

# Remove Approvals from Sidebar & Routes

## Summary
Remove the standalone "Approvals" section from the sidebar and delete the `/approvals/estimates` and `/approvals/orders` routes. Approval workflows will be managed within each project's estimate tab instead.

## Changes

### 1. `src/components/layout/AppSidebar.tsx`
- Delete the `gcNavItems` array (lines 60-63) containing "Estimate Approvals"
- Delete the entire "Approvals Section" collapsible group (~lines 195-230) that renders for GC/TC_PM
- Remove the `ClipboardCheck` icon import

### 2. `src/App.tsx`
- Remove lazy imports for `EstimateApprovals` and `OrderApprovals`
- Remove the `/approvals/estimates` and `/approvals/orders` route definitions

### 3. `src/components/Header.tsx`
- Remove the "Estimate Approvals" and "Order Approvals" dropdown menu items and the "Approvals" label from the header dropdown

### 4. `src/components/layout/BottomNav.tsx`
- Check and remove any approvals references from mobile nav (if present in "More" menu)

**4 files modified, no database changes.**

