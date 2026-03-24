

# Mobile Optimization — Full Plan

## Scope

Optimize every page for the 390px mobile viewport. This is a CSS/layout pass — no new features, no backend changes. The app already has responsive foundations (mobile topbar, bottom nav, `grid-cols-1` fallbacks) but many areas have spacing, overflow, touch target, and layout issues at 390px.

## Changes by Area

### 1. Dashboard Page (`src/pages/Dashboard.tsx`)
- Right sidebar column (`lg:grid-cols-[1fr_340px]`) stacks on mobile but produces a long scroll. Reorder so **Needs Attention** card appears before **Project List** on mobile using `order-first lg:order-none` on the attention card.
- Budget Card, Attention Card, and Reminders Tile stack naturally — no changes needed.

### 2. Dashboard KPI Row (`src/components/dashboard/DashboardKPIRow.tsx`)
- Currently `grid-cols-2 lg:grid-cols-4` — works at 390px but values overflow at `text-[2rem]`. Reduce KPI value to `text-[1.5rem]` on mobile (`text-[1.5rem] md:text-[2rem]`).
- Tag pill font is fine. Bar height is fine.

### 3. Dashboard Project List (`src/components/dashboard/DashboardProjectList.tsx`)
- Contract value text overflows on narrow screens. Hide contract value column below `sm` breakpoint.
- The `DropdownMenuTrigger` (three-dot menu) is `opacity-0 group-hover:opacity-100` — on touch devices it's never visible. Make it always visible on mobile (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`).
- Status filter pills: already have `min-h-[36px]` on mobile — good. Ensure horizontal scroll doesn't clip with `px-4` padding.

### 4. Project Home Overview (`src/pages/ProjectHome.tsx`)
- The overview grid `grid-cols-1 lg:grid-cols-[1fr_280px]` is correct.
- Duplicate `<BudgetTracking>` on lines 395-397 — remove the duplicate (bug).
- Inner cards (BillingCashCard, ProfitCard) use `md:grid-cols-2` — change to single column on mobile for readability.

### 5. Project TopBar / Mobile Header
- `MobileProjectHeader` is well-optimized. No changes needed.
- Desktop `ProjectTopBar` is `hidden lg:block` — correct.

### 6. Project Bottom Nav (`src/components/project/ProjectBottomNav.tsx`)
- Already handles mobile well with 56px height and safe area padding.
- Ensure the Capture FAB button doesn't overlap content — add `pb-[72px]` to the project content area on mobile (already `pb-24` which is 96px — sufficient).

### 7. CO List Page (`src/components/change-orders/COListPage.tsx`)
- Header flex-wrap works. The toggle buttons + "New CO" button squeeze on 390px.
- Make the view mode toggle hidden on mobile (force card view) — `hidden md:flex` on the toggle wrapper.
- KPI grid `grid-cols-2 lg:grid-cols-4` is fine at 390px.

### 8. CO Detail Page (`src/components/change-orders/CODetailPage.tsx`)
- This is a long page — needs `px-3` on mobile (currently handled by parent).
- The two-column layout for hero KPIs should stack on mobile.
- Financial sidebar should be full-width on mobile.

### 9. Invoices Tab (`src/components/invoices/InvoicesTab.tsx`)
- Header with filter dropdown and view switcher wraps OK with `flex-wrap`.
- The `SelectTrigger` is `w-[180px]` — change to `w-full sm:w-[180px]`.
- Force card/list view on mobile instead of table view (table is unusable at 390px).

### 10. Profile Page (`src/pages/Profile.tsx`)
- Form grids `grid-cols-1 sm:grid-cols-2` and `sm:grid-cols-3` are correct.
- The page title section at top should use tighter padding on mobile.
- Save buttons should be full-width on mobile.

### 11. Settings Page (`src/pages/Settings.tsx`)
- Already uses single-column Card layout — works well on mobile.
- Password toggle button touch target is fine.

### 12. Partner Directory (`src/pages/PartnerDirectory.tsx`)
- Search input `max-w-md` is fine.
- Tab triggers may need `min-h-[44px]` for touch targets.

### 13. RFIs Page (`src/pages/RFIs.tsx`)
- Project selector `w-64` — change to `w-full sm:w-64`.

### 14. Reminders Page (`src/pages/Reminders.tsx`)
- Uses `RemindersTile` which is already mobile-friendly.

### 15. Global AppLayout (`src/components/layout/AppLayout.tsx`)
- Content padding `px-3 sm:px-5 md:px-6` and `pb-24 lg:pb-6` — correct for bottom nav clearance.

### 16. Landing Page
- Not in scope — separate public-facing page with its own responsive design.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/DashboardKPIRow.tsx` | Responsive KPI value size |
| `src/components/dashboard/DashboardProjectList.tsx` | Hide contract value on mobile, always-visible menu button |
| `src/pages/ProjectHome.tsx` | Remove duplicate BudgetTracking, stack cards single-column on small screens |
| `src/components/change-orders/COListPage.tsx` | Hide view toggle on mobile, force card view |
| `src/components/invoices/InvoicesTab.tsx` | Full-width filter dropdown on mobile, force non-table view on mobile |
| `src/pages/RFIs.tsx` | Full-width project selector on mobile |
| `src/pages/Profile.tsx` | Full-width save buttons on mobile |
| `src/components/change-orders/CODetailPage.tsx` | Stack hero KPIs and financial panels on mobile |

## What Does NOT Change
- No backend changes
- No new components
- No routing changes
- No feature additions
- All existing functionality remains identical

