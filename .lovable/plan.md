

# Fix: Add BottomNav to Work Order Detail Page

## Problem
When a mobile user opens a Work Order detail page, the sticky bottom navigation bar is missing entirely. The `WorkOrderTopBar` hides its tab strip on mobile (`hidden lg:block`), so users have no way to navigate back to the project overview or work orders list.

## Root Cause
The `ChangeOrderDetailPage` component builds its own layout using `SidebarProvider` + `AppSidebar` + `SidebarInset`, but unlike `AppLayout` and `ProjectHome`, it never renders the `<BottomNav />` component.

## Fix

**File: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`**

1. Import `BottomNav` from `@/components/layout/BottomNav`
2. Add `<BottomNav />` inside each of the three layout branches (loading, error/not-found, and main content) -- right before the closing `</div>` of the `min-h-screen` wrapper
3. Add `pb-20` to the main content area so nothing is hidden behind the nav bar on mobile

This is a small, self-contained change that mirrors what `AppLayout` and `ProjectHome` already do.

## Technical Details

There are three render paths in the component (loading skeleton at ~line 118, error/not-found at ~line 136, and main content at ~line 170). Each wraps content in `<SidebarProvider><div className="min-h-screen flex w-full">...</div></SidebarProvider>`. The `<BottomNav />` will be placed as a sibling of `<SidebarInset>` inside each wrapper, consistent with the pattern used in `AppLayout` and `ProjectHome`.
