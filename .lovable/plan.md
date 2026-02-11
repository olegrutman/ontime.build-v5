

# Comprehensive UI Redesign: Ontime.Build

A visual-only refactor to unify layout, spacing, typography, and responsiveness across all pages while preserving every workflow, permission check, and business logic path.

---

## Design Principles Applied

- **Mobile-first, desktop-expanded**: Start with single-column stacked layouts, then use `lg:` breakpoints to expand into multi-column grids on desktop
- **Consistent spacing system**: All pages use `p-4 sm:p-6 pb-20` padding, `space-y-4 sm:space-y-6` vertical rhythm
- **Light gray canvas with white cards**: Background becomes light gray so Card components visually pop
- **Collapsible sections**: Long pages use `Collapsible` components with chevron toggles to reduce scroll depth on mobile
- **Sticky headers**: Project-level and detail-level top bars remain sticky with backdrop blur
- **44px minimum touch targets**: All interactive elements meet accessibility standards
- **No abbreviations**: Tab labels spell out full words (e.g., "Purchase Orders" not "POs")
- **Unified card style**: Consistent border-radius, shadow, padding across all cards

---

## Phase 1: Global Foundation (3 files)

### 1.1 Background Color Update
**File: `src/index.css`**
- Light theme: Change `--background` from `0 0% 100%` (white) to `220 14% 96%` (light gray)
- Keep `--card` at `0 0% 100%` (white) for contrast
- Dark theme: Adjust `--background` slightly lighter to `222 47% 8%` for card contrast

### 1.2 AppLayout Enhancement
**File: `src/components/layout/AppLayout.tsx`**
- Add `bg-background` to the outer wrapper
- Add responsive max-width container to `<main>`: `max-w-7xl mx-auto w-full`
- Standardize padding: `p-4 sm:p-6 pb-20`
- This automatically applies to all pages using AppLayout

### 1.3 TopBar Refinement
**File: `src/components/layout/TopBar.tsx`**
- Add `bg-card` instead of `bg-background/95` so the header is white against the gray canvas
- Slightly increase height to `h-16` for breathing room
- Ensure title uses `text-base font-semibold` consistently

---

## Phase 2: Dashboard (1 file)

### 2.1 Dashboard Layout
**File: `src/pages/Dashboard.tsx`**
- On mobile: Stack Zone B (Financial Card, Reminders) below Zone A
- On desktop (`lg:`): Keep the existing `grid-cols-[1fr_360px]` split
- Wrap "Needs Attention" items in a collapsible section that defaults open
- Ensure project list cards have consistent padding and spacing

---

## Phase 3: Project Home (2 files)

### 3.1 ProjectTopBar Tab Labels
**File: `src/components/project/ProjectTopBar.tsx`**
- Rename "POs" tab to "Purchase Orders" (no abbreviations)
- Add `bg-card` to header for white-on-gray contrast
- On mobile, the tab strip already scrolls horizontally (keep this)

### 3.2 ProjectHome Layout
**File: `src/pages/ProjectHome.tsx`**
- Switch from raw `SidebarProvider` to using `AppLayout` for consistency
- Overview tab: Keep two-zone layout on desktop, stack on mobile
- Wrap Zone B cards (Team, Contracts, Scope) in collapsible sections on mobile using `Collapsible`

---

## Phase 4: Work Order Detail (2 files)

### 4.1 WorkOrderTopBar
**File: `src/components/change-order-detail/WorkOrderTopBar.tsx`**
- Add `bg-card` for white header on gray canvas
- Ensure back navigation and status are accessible at 44px targets

### 4.2 ChangeOrderDetailPage Layout
**File: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`**
- Switch from raw `SidebarProvider` to `AppLayout`
- Desktop: Keep `grid-cols-[1fr_380px]` two-zone layout
- Mobile: Stack sidebar (Zone B) below main content
- Wrap each main section (Scope, Labor, Materials, Equipment) in `Collapsible` components that default open
- Add `max-w-7xl mx-auto` container

---

## Phase 5: Work Item Detail (1 file)

### 5.1 WorkItemPage
**File: `src/components/work-item/WorkItemPage.tsx`**
- Replace `Header` with `AppLayout` wrapper for sidebar consistency
- Keep `lg:grid-cols-3` desktop layout (2 + 1 sidebar)
- On mobile: Stack sidebar below main content
- Add collapsible wrappers around Details, Pricing, Labor, Materials sections

---

## Phase 6: Work Orders Page (1 file)

### 6.1 ChangeOrders Page
**File: `src/pages/ChangeOrders.tsx`**
- Remove `line-clamp-2` description from work order cards -- show only title, status badge, work type, and resource tags
- Change grid from `md:grid-cols-2 lg:grid-cols-3` to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for better mobile stacking
- Status filter tabs: Use horizontal scroll on mobile instead of wrapping

---

## Phase 7: Purchase Orders (1 file)

### 7.1 PurchaseOrders Page
**File: `src/pages/PurchaseOrders.tsx`**
- Desktop: Keep `lg:grid-cols-3` (1 list + 2 detail) layout
- Mobile: Stack detail below list
- PO list cards: Tighten padding, ensure 44px touch targets
- PO detail panel: Wrap meta info, line items table, and notes in collapsible sections

---

## Phase 8: Invoices Tab (1 file)

### 8.1 InvoicesTab
**File: `src/components/invoices/InvoicesTab.tsx`**
- Ensure invoice cards use consistent card styling
- Direction tabs (Sent/Received) use standard `TabsList` styling
- Status filter uses horizontal scroll on mobile
- Invoice detail view: Wrap approval flow and line items in collapsible sections

---

## Phase 9: Work Orders Tab (1 file)

### 9.1 WorkOrdersTab
**File: `src/components/project/WorkOrdersTab.tsx`**
- Remove or truncate description from list-view cards (show title + status + work type only)
- Status tabs: Use horizontal scroll container on mobile
- Board view: Ensure columns are horizontally scrollable on mobile

---

## Phase 10: Profile & Settings (1 file)

### 10.1 Profile Page
**File: `src/pages/Profile.tsx`**
- Wrap each section (Personal Info, Organization, Pricing Defaults, Notifications, Security) in `Collapsible` components
- Default first two sections open, rest collapsed
- Ensure form fields stack to single column on mobile (replace `grid-cols-2` and `grid-cols-3` with responsive variants: `grid-cols-1 sm:grid-cols-2`)
- Keep `max-w-3xl` container

---

## Phase 11: Team Management (1 file)

### 11.1 OrgTeam Page
**File: `src/pages/OrgTeam.tsx`**
- Wrap Members, Invite, and Pending Invitations in collapsible cards
- Members list: Ensure role dropdowns don't overflow on mobile (stack name/role vertically on small screens)

---

## Phase 12: Partner Directory (1 file)

### 12.1 PartnerDirectory Page
**File: `src/pages/PartnerDirectory.tsx`**
- Search input: Full width on mobile, max-w-md on desktop
- Organization/People groups: Already well-structured, ensure consistent card padding

---

## Phase 13: Admin Suppliers (1 file)

### 13.1 AdminSuppliers Page
**File: `src/pages/AdminSuppliers.tsx`**
- Use responsive grid: Single column on mobile, side-by-side on desktop
- Catalog items section: Wrap in collapsible
- Table: Use horizontal scroll wrapper on mobile

---

## Phase 14: Estimate Approvals (1 file)

### 14.1 EstimateApprovals Page
**File: `src/pages/EstimateApprovals.tsx`**
- Desktop: Keep list + detail side-by-side
- Mobile: Stack detail below list
- Line items table: Horizontal scroll on mobile
- Approval actions: Use sticky bottom bar on mobile

---

## Phase 15: Remaining Pages (4 files)

### 15.1 SupplierInventory, SupplierProjectEstimates, MaterialOrders, OrderApprovals
- Apply same patterns: `AppLayout` wrapper, consistent padding, collapsible sections, responsive grids
- Tables get horizontal scroll wrappers
- Detail panels stack below lists on mobile

---

## Phase 16: WorkItemCard Cleanup (1 file)

### 16.1 WorkItemCard
**File: `src/components/WorkItemCard.tsx`**
- Remove or hide description paragraph to keep cards compact
- Ensure card padding is consistent with the design system

---

## Summary of Changes

| Area | Files Modified | Key Change |
|------|---------------|------------|
| Global foundation | 3 | Gray background, consistent container, white TopBar |
| Dashboard | 1 | Responsive stacking, collapsible attention |
| Project Home | 2 | AppLayout migration, collapsible Zone B, full tab labels |
| Work Order Detail | 2 | AppLayout migration, collapsible sections, responsive zones |
| Work Item Detail | 1 | AppLayout migration, collapsible panels |
| List Pages | 6 | Compact cards, horizontal scroll tabs, responsive grids |
| Settings Pages | 3 | Collapsible form sections, responsive field grids |
| Card components | 2 | Remove descriptions, consistent padding |

**Total: Approximately 20 files modified, zero business logic changes.**

All existing workflows, role checks, permission gates, financial calculations, and four-party Work Order model remain completely untouched. Only layout classes, container widths, background colors, collapsible wrappers, and responsive breakpoints are modified.

