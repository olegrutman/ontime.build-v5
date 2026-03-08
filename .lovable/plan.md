

# Mobile Optimization for Platform Owner Pages

## Problem
All platform pages use a fixed 256px sidebar that's always visible and desktop-only table layouts. On mobile, the sidebar consumes the entire viewport width, tables overflow, and grids with 5-6 columns are unusable.

## Changes

### 1. Responsive PlatformSidebar + PlatformLayout
**PlatformSidebar.tsx** — Hide sidebar on mobile (`hidden lg:flex`). Add a Sheet-based drawer triggered from the layout's mobile header.

**PlatformLayout.tsx** — Add a sticky mobile header (visible `lg:hidden`) with hamburger menu to open sidebar drawer, page title, and breadcrumbs. Reduce content padding from `p-6` to `px-4 py-4` on mobile. Add `pb-6` for breathing room.

### 2. List Pages → Record Cards on Mobile
For **PlatformProjects, PlatformOrgs, PlatformUsers, PlatformLogs**: wrap each in a responsive pattern where the `<Table>` is `hidden md:table` and a mobile card list is `md:hidden`. Each card follows the standard RecordCard structure (header with title + status badge, body with key-value pairs, tap to navigate).

- **PlatformProjects**: Card shows Name, Owner Org, Status, Location, WO/PO/Invoice counts
- **PlatformOrgs**: Card shows Name, Type badge, Member count, Created date
- **PlatformUsers**: Card shows Name, Email, Created date
- **PlatformLogs**: Card shows Action badge, By, Target, Date — tap opens detail

### 3. Detail Pages — Responsive Grids + Scrollable Actions
**PlatformProjectDetail.tsx**:
- Summary card: change `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` (already decent, just verify)
- Financial overview: same responsive grid pattern
- Tables (Contracts, Invoices, POs, Team): wrap in horizontal scroll container (`overflow-x-auto`) on mobile, or convert to cards for the key tables
- Action buttons: horizontal scroll strip on mobile

**PlatformOrgDetail.tsx**:
- Action buttons: `overflow-x-auto flex-nowrap` on mobile
- Members/Projects tables: horizontal scroll or card view

**PlatformUserDetail.tsx**:
- Action buttons row: horizontal scroll strip
- Memberships already use a card-like layout (good)

### 4. Dashboard Components
**PlatformPeriodComparison.tsx**: Change skeleton from `grid-cols-5` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` (already has this on the component itself, fix the skeleton in Dashboard)

**PlatformDashboard.tsx**: Fix skeleton grid to be responsive. Search dropdown `max-h-80` is fine.

**PlatformGrowthChart.tsx**: Already uses `ResponsiveContainer` — reduce chart height on mobile (`h-52 md:h-72`).

**PlatformBreakdowns.tsx**: Already `grid-cols-1 md:grid-cols-3` — good.

### 5. Filter Bars
All filter bars (`flex items-center gap-3`) — on mobile, stack search full-width with select below, or use horizontal scroll. Use `flex-wrap` pattern.

## Files to Edit
- `src/components/platform/PlatformSidebar.tsx` — add Sheet drawer export
- `src/components/platform/PlatformLayout.tsx` — mobile header + responsive padding
- `src/pages/platform/PlatformProjects.tsx` — mobile record cards
- `src/pages/platform/PlatformOrgs.tsx` — mobile record cards
- `src/pages/platform/PlatformUsers.tsx` — mobile record cards
- `src/pages/platform/PlatformLogs.tsx` — mobile record cards
- `src/pages/platform/PlatformProjectDetail.tsx` — responsive grids, scrollable tables
- `src/pages/platform/PlatformOrgDetail.tsx` — responsive actions + tables
- `src/pages/platform/PlatformUserDetail.tsx` — responsive actions
- `src/pages/platform/PlatformDashboard.tsx` — fix skeleton grid
- `src/components/platform/PlatformGrowthChart.tsx` — responsive chart height

