
# Make RFI Page Consistent with Other Pages on Mobile

## Problem
The standalone RFIs page (`/rfis`) manually sets up its own layout with `SidebarProvider`, `AppSidebar`, `TopBar`, and `BottomNav` instead of using the shared `AppLayout` component that other pages (Financials, Dashboard, etc.) use. This causes inconsistent mobile behavior.

## Change

**File: `src/pages/RFIs.tsx`**

Replace the manual layout scaffolding with `AppLayout`:
- Remove imports for `SidebarProvider`, `SidebarInset`, `AppSidebar`, `BottomNav`, `TopBar`, `useDefaultSidebarOpen`
- Import `AppLayout` from `@/components/layout`
- Wrap the page content in `<AppLayout title="RFIs">` instead of the manual sidebar/topbar/bottomnav setup
- Keep the project selector and `RFIsTab` content as-is inside the layout

The result will match how `Financials.tsx`, `Dashboard.tsx`, and other pages are structured, ensuring consistent mobile headers, profile icons, and bottom navigation.
