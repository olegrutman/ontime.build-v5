# Mobile Optimization + Bottom Nav Cleanup

Two focused changes for the project overview at 390px:

## 1. Remove "Capture" from bottom nav

In `src/components/project/ProjectBottomNav.tsx`, delete the Capture FAB button (lines ~128-139), the `captureOpen` state, the `fieldCaptureEnabled` check, and the `<FieldCaptureSheet>` render at the bottom. Also drop the now-unused `Camera` icon, `FieldCaptureSheet`, `useAuth`, `useFeatureEnabled` imports, and `useState` for captureOpen.

Result: bottom nav becomes 5 cells (Overview · COs/WOs · Invoices · Orders · More), each gets more width, easier to tap.

## 2. Mobile-optimize the project overview

The screenshot shows KPI card tables (Materials Variance, etc.) wrapping every word vertically because they were designed for desktop column widths. The fixes are presentational only — no business logic touched.

### a. `OverviewAttentionStrip.tsx`
- Tighten chip padding on mobile (`5px 9px` → `4px 8px`) and make chips full-width stacked (`flex-col` < sm) instead of forced horizontal wrap so each chip is tappable.
- Hide the `· {projectName}` suffix entirely on mobile (already `hidden sm:inline`, keep).
- Reduce header gap.

### b. `KpiGrid.tsx`
- Keep `grid-cols-1` on mobile (already correct), but reduce `gap-2.5` → `gap-2` on mobile to recover horizontal space.

### c. `KpiCard` shared component (`src/components/shared/KpiCard.tsx`)
- The header `value` font (`2rem`) is fine, but `padding` and `minHeight` make small cards feel huge. Add a `sm:` breakpoint: smaller hero number (`1.5rem`) on mobile, reduce `minHeight` from 36 → 28.
- Apply `padding: '10px 12px'` on mobile (vs current desktop padding) on the card head.

### d. KPI card body tables (the main culprit)
The inline `<table>` blocks inside each KPI card overflow on 390px because columns like "GC Budget", "TC Price", "Status" all stay 100+ px wide. Two-pronged fix in `GCProjectOverviewContent.tsx` and `TCProjectOverview.tsx`:

1. Wrap each KPI card body table in a horizontally-scrollable container:
   ```tsx
   <div className="overflow-x-auto -mx-3 px-3">
     <table style={{ width: '100%', minWidth: 320, borderCollapse: 'collapse' }}>
   ```
2. Reduce the table cell padding on mobile (the shared `cellStyle` `padding: '9px 12px'` → `6px 8px` < sm) by switching the inline style to a tailwind class with a `sm:` variant, or by exporting `cellStyle` as a function that accepts a `compact` flag.
3. For the worst offender (Materials Variance pack table in `BuyerMaterialsAnalyticsSection.tsx`), drop low-priority columns on mobile: hide "Quoted As" / long secondary columns behind `hidden sm:table-cell`.

### e. Page-level container
- In `GCProjectOverviewContent.tsx` and `TCProjectOverview.tsx`, ensure the outer wrapper uses `px-3 sm:px-4` and `space-y-3 sm:space-y-4`.
- Bottom padding must clear the now-5-cell bottom nav: keep `pb-24` on the scroll container (already in place via parent layout — verify in `ProjectHome.tsx`).

### f. EditField rows
- Reduce min label width from `130` → `100` on mobile so the value column doesn't get squeezed to nothing.

## Files Edited
- `src/components/project/ProjectBottomNav.tsx` — remove Capture
- `src/components/project/OverviewAttentionStrip.tsx` — mobile chip layout
- `src/components/shared/KpiGrid.tsx` — mobile gap
- `src/components/shared/KpiCard.tsx` — responsive header padding/font, scrollable table wrapper helper
- `src/components/project/GCProjectOverviewContent.tsx` — wrap KPI tables in `overflow-x-auto`, responsive padding
- `src/components/project/TCProjectOverview.tsx` — same responsive treatment
- `src/components/project/BuyerMaterialsAnalyticsSection.tsx` — hide secondary columns on mobile

## Out of Scope
- No formula / business logic changes
- No sidebar warning logic changes (already shipped)
- Field Capture still accessible from elsewhere if needed (we can re-add it as a More-menu item if you want — see question below)

## Question
Should "Capture" be removed entirely from the project, or moved into the **More** drawer so it's still reachable from mobile?
