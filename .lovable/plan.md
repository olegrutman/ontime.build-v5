
# Unified Design System Redesign

## Summary
Bring every page in Ontime.Build to match the Overview page's Apple-style executive dashboard aesthetic. This is a CSS/component styling change only -- no business logic, data, or workflows are touched.

## Design Reference (Overview Page)
The Overview page establishes the standard:
- Soft gray background: `bg-[hsl(240_5%_96%)]`
- White cards with `rounded-2xl shadow-sm`, no heavy borders
- Uppercase tracking-wide section labels in `text-xs text-muted-foreground`
- Large bold financial numbers with `tabular-nums`
- Generous spacing with `space-y-4` and `gap-4`

## Implementation Strategy

This is a large change spanning 30+ files. To keep it manageable and safe, the work is split into **4 phases**, each touching a specific layer.

---

### Phase 1: Foundation Layer (Global Styles + Base Components)

**Goal**: Update the base Card component and global CSS so ALL pages inherit the new look automatically.

**1a. Update `src/components/ui/card.tsx`**
- Change Card base class from `rounded-none` to `rounded-2xl`
- Replace `border` with `shadow-sm`
- Set `bg-white dark:bg-card` as the default background (matching the Overview's custom cards)

**1b. Update `src/index.css`**
- Set the main `--background` to the soft gray tone `240 5% 96%` (matching `bg-[hsl(240_5%_96%)]` used on Overview)
- Ensure `--card` stays white: `0 0% 100%`
- Adjust dark mode equivalents proportionally

**1c. Update `src/components/layout/AppLayout.tsx`**
- The main content area already uses `bg-background`, so once the CSS variable changes, all `AppLayout` pages (Dashboard, Financials, Reminders, Profile, etc.) get the soft gray background automatically

**1d. Update `src/pages/ProjectHome.tsx`**
- Remove the hardcoded `bg-[hsl(240_5%_96%)]` on the overview tab since the global background now matches
- The non-overview tabs already use the global background

This single phase will fix ~60% of the visual inconsistency across the entire app, since most pages use Card and AppLayout.

---

### Phase 2: Project Tabs (Work Orders, Invoices, POs, RFIs, Returns, SOV)

**Goal**: Standardize the tab content pages within the project to match the Overview's card styling and spacing.

**2a. Work Orders Tab (`src/components/project/WorkOrdersTab.tsx`)**
- Summary stat cards: Replace `<Card className="p-4">` with styled divs using `bg-white dark:bg-card rounded-2xl shadow-sm p-4`
- Section headers: Use the same `text-xs uppercase tracking-wide text-muted-foreground font-medium` pattern
- Work order cards: Already use `<Card>`, which Phase 1 fixes. Add `hover:shadow-md transition-shadow` for consistent hover states

**2b. Invoices Tab (`src/components/invoices/InvoicesTab.tsx`)**
- Same summary card treatment as Work Orders
- Invoice cards already use `<Card>`, inherits from Phase 1

**2c. Purchase Orders Tab (`src/components/project/PurchaseOrdersTab.tsx`)**
- PO cards: Already use `<Card>`, inherits from Phase 1
- `POCard.tsx`: Replace `hover:border-primary/50` with `hover:shadow-md transition-shadow` (no border change, shadow-based hover)

**2d. RFIs Tab (`src/components/rfi/RFIsTab.tsx` + `RFICard.tsx`)**
- RFI cards: Replace `hover:border-primary/40` with `hover:shadow-md transition-shadow`

**2e. Returns Tab (`src/components/returns/ReturnCard.tsx`)**
- Replace `hover:shadow-md` (already correct, just ensure rounded-2xl inherits)

**2f. SOV Editor (`src/components/sov/ContractSOVEditor.tsx`)**
- Replace `CardHeader`/`CardTitle` usage with the overview-style uppercase label pattern
- Tables within cards: maintain horizontal scroll, but ensure the parent card follows rounded-2xl

---

### Phase 3: Dashboard + Global Pages

**Goal**: Bring non-project pages to the same standard.

**3a. Dashboard (`src/pages/Dashboard.tsx`)**
- Background: Handled by Phase 1 (AppLayout + CSS variable)
- `DashboardQuickStats.tsx`: Cards already use `<Card>`, inherits rounded-2xl from Phase 1. Ensure icon background uses `rounded-xl` instead of `rounded-lg`
- `DashboardProjectList.tsx`: Status tabs are fine. Project rows use `<Card>` -- inherits from Phase 1
- `ProjectRow.tsx`: Remove `border-l-4` left border accent (too heavy for the new design). Use a small colored dot or subtle left indicator instead. Keep `hover:bg-accent/50`

**3b. Profile Page (`src/pages/Profile.tsx`)**
- Uses `Card`, `CardHeader`, `CardTitle` -- inherits rounded-2xl from Phase 1
- Section titles: Replace `CardTitle` (text-2xl) with the smaller, uppercase label pattern where appropriate

**3c. Other Pages (Financials, OrgTeam, PartnerDirectory, etc.)**
- All use `AppLayout` + `Card` -- Phase 1 handles the base styling
- Spot-check each for hardcoded border styles and replace with shadow-based styling

---

### Phase 4: Navigation + Headers

**Goal**: Ensure sticky headers, tabs, and nav feel part of the same system.

**4a. TopBar (`src/components/layout/TopBar.tsx`)**
- Already uses `bg-card backdrop-blur`, which will now be white. This is correct -- clean header on soft gray body
- Ensure consistent height: `h-16` (already set)

**4b. ProjectTopBar (`src/components/project/ProjectTopBar.tsx`)**
- Tab styling: Already uses `data-[state=active]:bg-muted rounded-md` -- this matches the Overview pattern. No changes needed

**4c. WorkOrderTopBar (`src/components/change-order-detail/WorkOrderTopBar.tsx`)**
- Same header pattern. Already consistent

**4d. BottomNav (`src/components/layout/BottomNav.tsx`)**
- Ensure it uses `bg-card` (white) with subtle top border/shadow. Should match the TopBar in cleanliness

---

## Technical Details

### Files Modified (estimated ~25 files)

**Core (Phase 1 -- 4 files)**:
- `src/components/ui/card.tsx` -- rounded-2xl, shadow-sm, bg-white
- `src/index.css` -- background CSS variable to soft gray
- `src/components/layout/AppLayout.tsx` -- minor cleanup
- `src/pages/ProjectHome.tsx` -- remove hardcoded bg

**Project Tabs (Phase 2 -- ~10 files)**:
- `WorkOrdersTab.tsx`, `InvoicesTab.tsx`, `PurchaseOrdersTab.tsx`
- `POCard.tsx`, `RFICard.tsx`, `ReturnCard.tsx`
- `InvoiceCard.tsx`
- `ContractSOVEditor.tsx`
- Summary stat card styling in WO and Invoice tabs

**Dashboard + Pages (Phase 3 -- ~6 files)**:
- `DashboardQuickStats.tsx`, `ProjectRow.tsx`
- `Profile.tsx`, `Financials.tsx`
- `OnboardingChecklist.tsx`, `DashboardAttentionBanner.tsx`

**Navigation (Phase 4 -- ~3 files)**:
- `TopBar.tsx`, `BottomNav.tsx` -- minor tweaks

### Key CSS Changes
```text
Card base:     rounded-none border  -->  rounded-2xl shadow-sm border-0
Background:    209 40% 96%          -->  240 5% 96% (softer, more neutral gray)
Card bg:       210 40% 98%          -->  0 0% 100% (pure white)
Hover states:  border-primary/40    -->  shadow-md transition-shadow
```

### What Does NOT Change
- All business logic, calculations, permissions
- Database schema, RLS policies, edge functions
- Component props, data flow, state management
- Feature set -- nothing removed, nothing added
- Dark mode variables (adjusted proportionally but not redesigned)
