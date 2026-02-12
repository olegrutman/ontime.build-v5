

# Responsive Layout Overhaul -- Design + Layout Only

All changes are CSS/Tailwind class adjustments. No logic, data sources, routes, permissions, or component deletions.

## Summary of Issues Found

1. Several pages use `lg:grid-cols-3` for list/detail splits (PurchaseOrders, MaterialOrders) -- collapses to single column on iPad
2. EditProject and EditProjectScope use `grid-cols-2` without `sm:` prefix -- forms break on phones
3. Tables in SupplierInventory, MaterialOrders, PurchaseOrders lack mobile card fallback or horizontal scroll containment
4. CreateProject wizard already uses `md:grid-cols-4` (fixed previously) but navigation buttons are not mobile-optimized
5. Several pages build their own layout instead of using `AppLayout` (SupplierInventory, CreateProject)
6. Inconsistent page container usage -- some use `container mx-auto px-4`, others use `max-w-7xl mx-auto p-4 sm:p-6`

---

## Changes by File

### Phase 1: Global Consistency

**1. `src/components/layout/AppLayout.tsx`** -- Standardize page container padding
- Change `p-4 sm:p-6` to `px-4 sm:px-5 md:px-6 py-4 sm:py-6` for consistent side padding across breakpoints
- No structural changes

**2. `src/components/layout/TopBar.tsx`** -- No changes needed (already responsive)

**3. `src/components/project/ProjectTopBar.tsx`** -- No changes needed (already has scrollable tabs)

### Phase 2: List/Detail Split Pages (Master-Detail Pattern)

These pages use a `lg:grid-cols-3` split that collapses on iPad. Fix: shift to `md:grid-cols-3`.

**4. `src/pages/PurchaseOrders.tsx`**
- Line 354: `lg:grid-cols-3` -> `md:grid-cols-3`
- Line 356: `lg:col-span-1` -> `md:col-span-1`
- Line 392: `lg:col-span-2` -> `md:col-span-2`
- Line 436: `grid-cols-2` -> `grid-cols-1 sm:grid-cols-2` (PO detail metadata grid on mobile)

**5. `src/pages/MaterialOrders.tsx`**
- Line 186: `lg:grid-cols-3` -> `md:grid-cols-3`
- Line 188: `lg:col-span-1` -> `md:col-span-1`
- Line 233: `lg:col-span-2` -> `md:col-span-2`

### Phase 3: Form Pages (Mobile Single-Column)

**6. `src/pages/EditProject.tsx`**
- Lines 380, 399, 430, 467, 620: `grid-cols-2` -> `grid-cols-1 sm:grid-cols-2` (forms stack on mobile)

**7. `src/pages/EditProjectScope.tsx`**
- Line 314: `lg:grid-cols-2` -> `md:grid-cols-2` (activate 2-col on iPad)
- Lines 703, 784: Checkbox grids `grid-cols-2` -- leave as-is (they work on mobile since they're small items)
- Line 294: header flex -- add `flex-wrap` for mobile button wrapping

**8. `src/pages/Profile.tsx`**
- Forms already use `grid-cols-1 sm:grid-cols-2` -- no changes needed
- Line 389: `sm:grid-cols-3` -- verify spacing on narrow screens (likely fine)

### Phase 4: Card Grid Pages

**9. `src/components/project/WorkOrdersTab.tsx`**
- Line 200: Already `md:grid-cols-2 lg:grid-cols-3` -- no change needed

**10. `src/components/project/ProjectFinancialsSectionNew.tsx`**
- Line 510: `lg:grid-cols-4` -> `md:grid-cols-2 lg:grid-cols-4` (wrap to 2-col on iPad)
- Line 332: Loading skeleton same treatment

**11. `src/components/project/ProjectFinancialsSection.tsx`**
- Line 33: `lg:grid-cols-4` -> `md:grid-cols-2 lg:grid-cols-4`

**12. `src/components/invoices/InvoicesTab.tsx`**
- Lines 285, 320: Already `sm:grid-cols-2 lg:grid-cols-3` -- no change needed (previous fix applied)

**13. `src/components/StatsCards.tsx`**
- Line 70: `lg:grid-cols-5` -> `md:grid-cols-3 lg:grid-cols-5` (prevent 2-col jump to 5-col)

### Phase 5: Create Project Wizard

**14. `src/pages/CreateProject.tsx`**
- Line 264: Already `md:grid-cols-4` -- no change needed
- Lines 282-307: Mobile navigation buttons -- change to:
  - On mobile (`sm:` below): Previous = full-width outline, Next/Create = full-width primary, stacked vertically
  - On desktop: keep current side-by-side layout
  - Add `flex-col-reverse sm:flex-row` to the nav container

### Phase 6: Table-Heavy Pages (Horizontal Scroll Containment)

**15. `src/pages/SupplierInventory.tsx`**
- Line 445: Table is already inside `overflow-x-auto` within a Card -- good
- No changes needed for the table
- Line 375: Stats grid `md:grid-cols-3` -- already correct

### Phase 7: Supplier Project Estimates & Other Detail Pages

**16. `src/pages/SupplierProjectEstimates.tsx`** -- Check and apply same `md:` breakpoint pattern if using `lg:` splits

**17. `src/pages/SupplierEstimates.tsx`** -- Already fixed in previous round

**18. `src/pages/AdminSuppliers.tsx`** -- Already fixed in previous round

**19. `src/pages/OrderApprovals.tsx`** -- Already fixed in previous round

**20. `src/pages/EstimateApprovals.tsx`** -- Already fixed in previous round

### Phase 8: Landing Page

**21. `src/components/landing/HowItWorksSection.tsx`**
- Line 49: Already `md:grid-cols-2 lg:grid-cols-4` -- no change needed

**22. `src/components/landing/FeaturesSection.tsx`**
- Line 55: Already `md:grid-cols-2 lg:grid-cols-3` -- no change needed

### Phase 9: Work Item / T&M Pages

**23. `src/components/work-item/WorkItemPage.tsx`** -- Already fixed in previous round to `md:grid-cols-3`

---

## Technical Details

### Files Modified (net new changes only -- excludes previously fixed files)

| File | Change |
|------|--------|
| `src/pages/PurchaseOrders.tsx` | `lg:` -> `md:` for master-detail split |
| `src/pages/MaterialOrders.tsx` | `lg:` -> `md:` for master-detail split |
| `src/pages/EditProject.tsx` | `grid-cols-2` -> `grid-cols-1 sm:grid-cols-2` on 5 form grids |
| `src/pages/EditProjectScope.tsx` | `lg:grid-cols-2` -> `md:grid-cols-2` + header flex-wrap |
| `src/pages/CreateProject.tsx` | Mobile-stack navigation buttons |
| `src/components/project/ProjectFinancialsSectionNew.tsx` | `lg:grid-cols-4` -> `md:grid-cols-2 lg:grid-cols-4` |
| `src/components/project/ProjectFinancialsSection.tsx` | Same pattern |
| `src/components/StatsCards.tsx` | Add `md:grid-cols-3` intermediate step |

### What Is NOT Changed
- No component deletions
- No logic changes
- No route changes
- No data source changes
- No permission changes
- No new components or pages (the QA checklist item from the request is omitted as it would be a new product feature)
- Landing page components are already responsive
- Pages already fixed in the previous round are not re-touched

