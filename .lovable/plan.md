

# Align Project Overview Page Fonts & Styles with Dashboard

## Problem
The overview page uses different typography and card styling than the dashboard. Dashboard uses `font-heading` (Barlow Condensed) for large numbers, count-up animations, bottom accent bars on KPI cards, and specific tag/badge patterns. The overview page uses plain `text-[28px] font-bold` and simpler card styling.

## Changes — `src/components/project/ProjectOverviewV2.tsx`

### 1. Hero Card Typography
- Project name: add `font-heading` class (Barlow Condensed) — replace inline `style={DT.heading}` with the Tailwind class used on dashboard
- KPI tile values: switch from `text-base font-semibold` + `style={DT.mono}` to `font-heading text-[1.5rem] font-black tracking-tight` matching dashboard KPICard pattern
- Add count-up animation to KPI tile values (reuse the `useCountUp` hook from DashboardKPIRow or extract it to a shared util)

### 2. KPI Tiles — Match Dashboard KPICard Pattern
- Add bottom accent line (`absolute bottom-0 left-0 right-0 h-[2px]`) with color per tile (blue for Contract, emerald for Paid, amber for Pending)
- Add tag pill (percentage badge) like dashboard cards show
- Add sub-text line below the value
- Add `hover:-translate-y-px hover:shadow-md` interaction
- Use `animate-fade-up` with staggered delays

### 3. Section Headers
- Already using `DT.sectionHeader` — keep as-is

### 4. Budget Rows
- Values should use `font-heading` for amounts instead of `DT.mono` to match dashboard's number style
- Progress bars already match

### 5. Card Wrappers (Right Column)
- Already using `DT.cardWrapper` — consistent

### 6. Extract `useCountUp` to Shared Utility
- Move the `useCountUp` hook from `DashboardKPIRow.tsx` to `src/hooks/useCountUp.ts`
- Import it in both `DashboardKPIRow` and `ProjectOverviewV2`

## Files Modified
- `src/hooks/useCountUp.ts` — new shared hook (extracted from DashboardKPIRow)
- `src/components/project/ProjectOverviewV2.tsx` — restyle hero, KPI tiles, typography
- `src/components/dashboard/DashboardKPIRow.tsx` — import useCountUp from shared location

## Files NOT Changed
- Database, hooks, edge functions, navigation — untouched

