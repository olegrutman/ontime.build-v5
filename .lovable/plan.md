

# Mobile-First Responsive Optimization for Ontime.Build

## Overview
Systematic responsive refactoring across the entire app, executed in phases. No changes to business logic, database, permissions, or desktop layouts. All work is CSS/layout-level refactoring with reusable mobile patterns.

---

## Phase 1: Global Foundation (do first — everything else depends on this)

### 1a. Fix `App.css` root constraint
The `#root` block sets `max-width: 1280px`, `margin: 0 auto`, `padding: 2rem`, and `text-align: center`. This fights against the app's own layout system. **Remove these rules entirely** — the app shell already handles layout.

### 1b. Create reusable mobile utility components

**`src/components/ui/responsive-table.tsx`** — A wrapper that renders a `<Table>` on `md+` and a stacked card list on mobile. Used by Invoice, PO, and SOV table views.

**`src/components/ui/sticky-action-bar.tsx`** — A fixed-bottom action bar (above bottom nav) for primary actions like Save, Submit, Approve. 44px min-height buttons, safe-area padding.

**`src/components/ui/mobile-section.tsx`** — Collapsible accordion section for grouping secondary details on mobile.

### 1c. Standardize global spacing
- Add a global `overflow-x: hidden` on `body` and `#root` in `index.css`
- Ensure `AppShell` main content uses `px-3` on mobile (already close, verify)
- Ensure `ProjectShell` content area has consistent mobile padding

---

## Phase 2: App Shell & Navigation

### 2a. `ContextBar` — already mostly good
- Verify header doesn't overflow on 320px
- Ensure logo + actions don't wrap

### 2b. `ProjectShell` header
- On mobile, show project name truncated in the header bar (currently missing)
- Compact the status badge + download + avatar to fit 320px

### 2c. `ProjectTabBar` — already mobile-only with horizontal scroll
- Increase tap target height from ~36px to 44px
- Add scroll fade indicators (left/right gradient) so users know there's more

### 2d. `ProjectBottomNav` — already exists
- Verify all tap targets are 44×44 minimum
- Already handles safe area — good

### 2e. `MobileBottomNav` (dashboard) — already exists
- Same tap target audit

---

## Phase 3: Dashboard

### 3a. `DashboardKPIs` / `DashboardKPIRow`
- Ensure 2-col grid on mobile (currently `grid-cols-2 lg:grid-cols-4` — verify)
- Make KPI values larger and more readable

### 3b. `ProjectSnapshotList` / `ProjectRow`
- Ensure project cards are single-column on mobile with clear status, value, and next action
- Surface pending actions prominently

### 3c. `DashboardBusinessSnapshot`, `DashboardActionQueue`, `DashboardMaterialsHealth`
- Already in a `grid-cols-1 md:grid-cols-2` pattern — verify spacing
- Ensure cards don't overflow horizontally

### 3d. Role-specific dashboard views (GC/TC/FC/Supplier)
- Audit each for mobile card layouts — they use the same KPI expandable cards
- Ensure no horizontal overflow

---

## Phase 4: Project Overview

### 4a. Role-specific overviews (`GCProjectOverviewContent`, `TCProjectOverview`, `FCProjectOverview`, `SupplierProjectOverview`)
- Convert any side-by-side desktop card grids to single-column on mobile
- Make financial KPI cards full-width and expandable
- Ensure contract values, WO totals, invoice totals are scannable

### 4b. `ProjectFinancialCommand`, `MaterialsCommandCenter`, `COImpactCard`
- These are dense desktop components — wrap in collapsible sections on mobile
- Ensure monetary values use large `font-mono` text

---

## Phase 5: Invoices

### 5a. `InvoicesTab`
- Auto-switch to card view (`InvoiceCard`) on mobile instead of table view
- Hide the view switcher on mobile (force card view)
- Make filter selects full-width on mobile
- Sticky create button at bottom

### 5b. `InvoiceTableView` → hidden on mobile (card view only)
- No changes to table itself — just hide below `md` breakpoint

### 5c. `InvoiceCard`
- Already card-based — audit for 320px fit
- Ensure action buttons have 44px tap targets
- Make amount and status more prominent

### 5d. `InvoiceDetail`
- Audit for mobile scrolling and section stacking
- Ensure approve/reject actions are sticky at bottom

---

## Phase 6: Change Orders / Work Orders

### 6a. `COListPage`
- Already uses `useIsMobile` — good foundation
- Force card/list view on mobile, hide board view
- Make filter chips horizontally scrollable
- Stats strip: 2-col grid on mobile

### 6b. `COBoardCard`
- Already card-based — audit sizing
- Ensure status, amount, location are visible without truncation on 320px

### 6c. `CODetailLayout` / `COHeaderStrip` / `COKPIStrip`
- Stack KPI strip vertically or 2-col on mobile
- Make scope items, hour entries, and material panels single-column
- Sticky submit/approve footer

### 6d. CO/WO Wizard (`COWizard`, `TMWOWizard`)
- Already step-based — verify each step fits on mobile
- Ensure scope selectors, location pickers use large tap targets
- Sticky next/back buttons

---

## Phase 7: Purchase Orders

### 7a. `PurchaseOrdersTab`
- Same pattern as Invoices: force card view on mobile
- Hide table below `md`

### 7b. `POCard`
- Audit for 320px fit
- Ensure line item count, total, status, and supplier name are visible

### 7c. `PODetail`
- Stack line items vertically on mobile
- Sticky action bar for approve/order/price actions

### 7d. PO Wizard (`POWizardV2`)
- Verify step-by-step flow works on mobile
- Ensure item search/add is usable on phone

---

## Phase 8: SOV

### 8a. `ContractSOVEditor` / `ProjectSOVEditor`
- This is the hardest table — multi-column with editable fields
- On mobile: render as accordion groups (by phase/section)
- Each item shows description, amount, % complete in a stacked card
- Inline edit via bottom sheet instead of inline inputs
- Preserve 100% total logic — no calculation changes

---

## Phase 9: Project Setup / Wizards

### 9a. `SetupWizardV2`
- Already step-based with progress bar
- Ensure questions panel is full-width on mobile (hide SOV preview on mobile, show as separate step)
- Stack inputs vertically
- Sticky continue/back buttons

### 9b. `ProjectSetupFlow`
- Audit form sections for mobile stacking
- Ensure address, building type, and scope selectors work on phone

---

## Phase 10: Team / Documents / Other Pages

### 10a. `OrgTeam` page
- Audit member list for mobile card layout
- Ensure invite dialog fits mobile viewport

### 10b. `PartnerDirectory`
- Card list on mobile

### 10c. `RFIsTab`, `ReturnsTab`, `DailyLogPanel`, `ScheduleTab`
- Audit each for horizontal overflow
- Convert any tables to cards on mobile

### 10d. Profile / Settings pages
- Stack form fields vertically
- Ensure save buttons are accessible

---

## Technical Details

**Files modified** (estimated 40-60 files):
- `src/App.css` — remove `#root` constraints
- `src/index.css` — add `overflow-x: hidden` on body
- 3 new shared components in `src/components/ui/`
- ~15 tab/list pages (Invoices, POs, COs, SOV, etc.) — add mobile view switching
- ~20 card components — tap target and sizing audit
- ~10 detail/form pages — add sticky actions, stack layouts
- ~5 shell/layout components — padding and header tweaks

**No files archived** — all changes are additive responsive CSS. Existing desktop layouts preserved via breakpoint guards (`md:`, `lg:`).

**No database, API, auth, or permission changes.**

**Breakpoints used**: Default Tailwind (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`). Mobile-first means base styles target 320-430px, then scale up.

---

## Execution Order
1. Global foundation (App.css fix, shared components, spacing)
2. App shell & navigation
3. Dashboard
4. Project Overview
5. Invoices
6. Change Orders / Work Orders
7. Purchase Orders
8. SOV
9. Project Setup / Wizards
10. Team / Documents / Other pages

This is a large effort. I recommend executing phases 1-3 first, then 4-7, then 8-10 in subsequent rounds to keep changes reviewable.

