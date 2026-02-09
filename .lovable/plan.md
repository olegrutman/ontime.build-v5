

# Mobile Optimization -- Every Screen

## Summary

A comprehensive pass across all authenticated screens to ensure consistent, touch-friendly layouts on phones (390px and below). Many screens already have reasonable responsive foundations (e.g., `sm:` breakpoints on grids, scrollable tabs), but several areas have problems: overflowing cards, tiny tap targets, wasted space, status filter buttons wrapping poorly, and the Sasha bubble overlapping content.

---

## Issues Found (by screen)

### 1. Dashboard
- Financial Snapshot card sub-metrics hidden on mobile by default (good), but expand button is `lg:hidden` -- works.
- **Project row**: Contract value and date info disappear on mobile (`hidden sm:flex`), but the mobile fallback row (`sm:hidden`) is functional. Minor: action menu button could use slightly larger tap target.
- Status filter tabs (`StatusMenu`) could overflow if many statuses have long labels.

### 2. Project Overview (`ProjectHome`)
- **Two-zone grid** uses `lg:grid-cols-[1fr_360px]` which stacks correctly on mobile. OK.
- **MetricStrip**: Uses `sm:grid-cols-3` -- stacks to single column on mobile. The segments inside each metric cell use `flex gap-4` which can overflow on narrow screens with 3 segments. Needs `overflow-x-auto` or smaller text.
- **Sasha bubble**: Overlaps with the bottom of content on mobile. Needs `pb-20` on main content to prevent obstruction.

### 3. Project TopBar (Tab Navigation)
- Tabs are scrollable (`overflow-x-auto`). Good.
- On mobile, project name is centered but the status dropdown + notification bell crowd the right. Minor spacing issue.

### 4. Work Orders Tab
- **Status filter buttons** (`flex flex-wrap gap-2`) wrap to multiple rows on mobile, taking up excessive vertical space. Should use horizontal scroll instead.
- **Work Order cards grid** uses `md:grid-cols-2 lg:grid-cols-3` -- stacks to single column on mobile. Good.
- Header ("Work Orders" title + "New Work Order" button) uses `flex-col sm:flex-row`. Good.

### 5. Work Order Detail (`ChangeOrderDetailPage`)
- **Progress bar**: Step labels (`text-[11px]`) and 8px circles are small but acceptable. Connector lines use `mx-2` which can squeeze steps together on mobile. Needs better horizontal scroll or smaller gaps.
- **Two-zone grid** uses `lg:grid-cols-[1fr_380px]` -- stacks on mobile. Good.
- **Meta info row** in the header card uses `flex flex-wrap gap-4` which can be cramped.
- **WorkOrderTopBar**: Breadcrumb (project name / WO title) hides project name on mobile (`hidden sm:inline`). Good.

### 6. Purchase Orders Tab
- Header uses `flex-col sm:flex-row`. Good.
- **PO cards grid** uses `md:grid-cols-2 lg:grid-cols-3`. Stacks on mobile. Good.
- **POCard** internal grid uses `grid-cols-2 gap-4` which can squeeze on narrow screens. Text truncation needed.
- Status filter select is `w-36` which is fine.

### 7. Invoices Tab
- Similar card layout to POs. `grid-cols-2` internal layout can squeeze.

### 8. Sasha Bubble
- Panel is `w-[min(400px,calc(100vw-2rem))]` -- responsive. Good.
- **Bubble button** (`bottom-4 right-4`) can overlap scrollable content. All pages need bottom padding.
- On mobile, the bubble can overlap the bottom tab area of the ProjectTopBar when scrolled.

### 9. PO Wizard V2
- Already uses Sheet on mobile (`h-[95vh]`). Good.

### 10. Work Order Wizard / FC Dialog
- Uses Dialog. Should use Sheet on mobile for consistency (like POWizardV2 pattern).

---

## Changes

### File 1: `src/components/project/WorkOrdersTab.tsx`
**Status filter buttons -- horizontal scroll on mobile**

Replace `flex flex-wrap gap-2` with a horizontal scrollable container that prevents wrapping on mobile:
- Wrap status buttons in `overflow-x-auto` div
- Use `flex gap-2 pb-1` (no wrap) so buttons scroll horizontally
- Add `-webkit-overflow-scrolling: touch` for smooth mobile scroll

### File 2: `src/components/project/MetricStrip.tsx`
**Metric segments -- prevent overflow on narrow screens**

- Change segment text from `text-2xl` to `text-xl sm:text-2xl`
- Add `overflow-hidden` to the cell container
- Make segment values `text-lg` on mobile for better fit

### File 3: `src/components/change-order-detail/WorkOrderProgressBar.tsx`
**Progress bar -- horizontal scroll on mobile**

- Wrap the progress steps in `overflow-x-auto` to allow scrolling when steps don't fit
- Reduce step circle from `w-8 h-8` to `w-7 h-7 sm:w-8 sm:h-8`
- Reduce connector `mx-2` to `mx-1 sm:mx-2`
- Add `min-w-0` on flex containers to prevent overflow

### File 4: `src/components/purchase-orders/POCard.tsx`
**Card content -- better mobile text handling**

- Add `truncate` to supplier name
- Reduce internal gap from `gap-4` to `gap-3` on the `grid-cols-2`

### File 5: `src/components/invoices/InvoiceCard.tsx`
**Card content -- better mobile text handling**

- Add `truncate` on billing period text
- Reduce gap from `gap-4` to `gap-3`

### File 6: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`
**Main content -- add bottom padding for Sasha bubble**

- Add `pb-20` to the main content container so Sasha bubble doesn't obscure the last card

### File 7: `src/pages/ProjectHome.tsx`
**Main content -- add bottom padding for Sasha bubble**

- Add `pb-16` to the scrollable content area

### File 8: `src/pages/Dashboard.tsx`
**Main content -- add bottom padding for Sasha bubble**

- Add `pb-16` to the dashboard content wrapper

### File 9: `src/components/sasha/SashaBubble.tsx`
**Mobile-friendly chat panel positioning**

- On mobile (below 640px), make the chat panel full-width at the bottom instead of floating:
  - Change panel positioning to `bottom-16 left-2 right-2` on mobile (above the bubble)
  - Set `max-h-[60vh]` on mobile to leave room for the keyboard
  - Make the input area sticky and always visible

### File 10: `src/components/change-order-detail/WorkOrderTopBar.tsx`
**Mobile breadcrumb -- show truncated WO title properly**

- Ensure `truncate` is applied to the WO title on mobile
- Make the status badge use a smaller variant on mobile

### File 11: `src/components/project/ProjectFinancialsSectionNew.tsx`
**Financial cards grid -- mobile stack**

- The grid already uses `md:grid-cols-2 lg:grid-cols-4`. On mobile (single column) this is fine.
- Add `overflow-hidden` to prevent horizontal scroll on contract value editing

---

## Technical Notes

- All changes are CSS/Tailwind class adjustments -- no logic or data changes
- No new dependencies needed
- No database changes
- Follows existing patterns: `sm:` breakpoint for tablet, `lg:` for desktop
- Maintains 44px minimum touch targets on all interactive elements
- Uses `overflow-x-auto` pattern already established in `ProjectTopBar` for scrollable tabs

