

# Make the Entire Website Responsive for All Devices

## Overview
The app currently uses `lg:` (1024px+) breakpoints for most two-zone layouts, which means iPads (~820px) and smaller laptops (~1024-1280px) collapse to a single stacked column unnecessarily. This plan shifts key breakpoints to `md:` (768px+) with narrower sidebar columns, ensuring the app looks great on phones, iPads, small laptops, and desktops.

## Changes by File

### 1. Dashboard (`src/pages/Dashboard.tsx`)
- Change the main two-zone grid from `lg:grid-cols-[1fr_360px]` to `md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_340px]`
- Apply the same fix to the loading skeleton grid
- This enables the side-by-side layout on iPads

### 2. Change Order Detail (`src/components/change-order-detail/ChangeOrderDetailPage.tsx`)
- Change `lg:grid-cols-[1fr_380px]` to `md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_380px]`
- Keeps the detailed sidebar visible on iPad instead of pushed below

### 3. Work Item Page (`src/components/work-item/WorkItemPage.tsx`)
- Change `lg:grid-cols-3` to `md:grid-cols-3` so the sidebar appears on iPad
- Adjust column spans accordingly

### 4. Index / Work Items (`src/pages/Index.tsx`)
- Change `lg:grid-cols-3` to `md:grid-cols-3`
- Adjust column spans from `lg:col-span-*` to `md:col-span-*`

### 5. Admin Suppliers (`src/pages/AdminSuppliers.tsx`)
- Change `lg:grid-cols-3` to `md:grid-cols-3` with `md:col-span-*` adjustments

### 6. Supplier Estimates (`src/pages/SupplierEstimates.tsx`)
- Same pattern: `lg:grid-cols-3` to `md:grid-cols-3`

### 7. Order Approvals (`src/pages/OrderApprovals.tsx`)
- Same pattern: `lg:grid-cols-3` to `md:grid-cols-3`

### 8. Estimate Approvals (`src/pages/EstimateApprovals.tsx`)
- Same breakpoint shift if applicable

### 9. Create Project (`src/pages/CreateProject.tsx`)
- Change `lg:grid-cols-4` to `md:grid-cols-4` so the wizard progress sidebar appears on iPad

### 10. Financial Cards (`src/components/project/ProjectFinancialsSectionNew.tsx`)
- Already partially fixed; ensure `md:grid-cols-2 lg:grid-cols-4` pattern is consistent

### 11. Invoice Grid (`src/components/invoices/InvoicesTab.tsx`)
- Change `lg:grid-cols-3` to `md:grid-cols-2 lg:grid-cols-3` so cards don't stack to one column on iPad

### 12. Change Orders Grid (`src/pages/ChangeOrders.tsx`)
- Change `lg:grid-cols-3` to `md:grid-cols-2 lg:grid-cols-3`

## What Stays the Same
- The sidebar (`AppSidebar`) already uses the shadcn collapsible pattern with icon mode on mobile -- no changes needed
- The `TopBar` already adapts for mobile -- no changes needed
- Mobile phone layouts (below 768px) remain single-column as designed
- All touch targets already meet the 44px minimum standard

## Technical Summary
- No new dependencies or components
- All changes are Tailwind class adjustments (replacing `lg:` with `md:` or adding `md:` intermediate breakpoints)
- Approximately 12 files modified with small class name changes
- No functional or data changes

