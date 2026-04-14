

# Unify KPI Cards Across All Screens

## Problem
The `KpiCard` component is duplicated identically in 9 files (4 dashboard views + 5 project overview views). Each copy uses inline styles with slightly different settings. The grid layouts are also inconsistent — some use Tailwind classes, others use inline CSS with `!important` overrides. This causes:
- Cards in the same row have different heights (label text wraps differently, sub text varies)
- Inconsistent gap/grid sizing between dashboard and project views
- No text truncation or fixed-height zones, so content shifts unpredictably
- Different responsive breakpoints across views

## Approach
Extract a single shared `KpiCard` component and shared design tokens, then replace all 9 copies. Standardize the grid wrapper as well.

### 1. Create shared KPI primitives
**New file: `src/components/shared/KpiCard.tsx`**
- Extract the `KpiCard`, `Pill`, `Bar`, `THead`, `TRow`, `TdN`, `TdM` components
- Extract the shared color tokens (`C`), font tokens (`fontVal`, `fontMono`, `fontLabel`), and `fmt` helper
- Add fixed-height zones inside the card:
  - **Label zone**: `min-h-[28px]` — ensures 2-line labels align across cards
  - **Value zone**: fixed single line
  - **Sub zone**: `min-h-[24px]` with `line-clamp-2` to prevent unbounded growth
  - **Pill area**: `min-h-[22px]` so cards with 0-2 pills stay aligned
- Export everything for consumption by all 9 files

### 2. Create shared KPI grid wrapper
**New file: `src/components/shared/KpiGrid.tsx`**
- A simple wrapper that standardizes: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5`
- Accepts optional `columns` override for views that need 3-col or other layouts
- Removes all inline `gridTemplateColumns` + `!important` class hacks

### 3. Update all 9 consumer files
Replace the local `KpiCard` + helpers + grid divs with imports from the shared module:

**Dashboard views (4 files):**
- `src/components/dashboard/GCDashboardView.tsx`
- `src/components/dashboard/TCDashboardView.tsx`
- `src/components/dashboard/FCDashboardView.tsx`
- `src/components/dashboard/SupplierDashboardView.tsx`

**Project overview views (5 files):**
- `src/components/project/GCProjectOverviewContent.tsx`
- `src/components/project/TCProjectOverview.tsx`
- `src/components/project/FCProjectOverview.tsx`
- `src/components/project/SupplierProjectOverview.tsx`

For each file:
- Remove local `KpiCard`, `Pill`, `Bar`, `THead`, `TRow`, `TdN`, `TdM`, `C`, `fontVal`, `fontMono`, `fontLabel`, `fmt`
- Import from `@/components/shared/KpiCard`
- Replace the grid wrapper `<div>` with `<KpiGrid>`

### 4. Responsive alignment fixes
Inside the shared `KpiCard`:
- **Mobile (< 640px)**: Cards stack 1-col, label + value left-aligned, pills wrap below icon
- **Tablet (640–1024px)**: 2-col grid, cards have `min-h` so pairs align
- **Desktop (1024+)**: 4-col grid, all zones fixed-height for perfect row alignment

## Technical details

The shared card structure (collapsed state):
```text
┌─────────────────────────────┐
│ 3px accent bar              │
│ [icon 36px]     [pills ···] │  ← min-h-[36px]
│ LABEL TEXT UPPERCASE         │  ← min-h-[28px], line-clamp-2
│ $150K                        │  ← fixed single line, 2rem Barlow
│ subtitle text here           │  ← min-h-[24px], line-clamp-2
│─────────────────────────────│
│ Expand for detail        ▸  │
└─────────────────────────────┘
```

Key styling constants (shared across all views):
- Card: `border-radius: 14px`, `border: 1px solid #E4E8F0`
- Label: `0.62rem`, uppercase, `letter-spacing: 0.7px`, `#9AAABB`
- Value: `2rem`, Barlow Condensed 900, `#0F1923`
- Sub: `0.67rem`, `#5A6A7E`
- Expand bar: `#F7F9FC` background, `0.67rem`
- Grid: `gap-2.5` (10px) on all breakpoints

## Files to create
- `src/components/shared/KpiCard.tsx`
- `src/components/shared/KpiGrid.tsx`

## Files to edit (9 files — remove duplicates, import shared)
- `src/components/dashboard/GCDashboardView.tsx`
- `src/components/dashboard/TCDashboardView.tsx`
- `src/components/dashboard/FCDashboardView.tsx`
- `src/components/dashboard/SupplierDashboardView.tsx`
- `src/components/project/GCProjectOverviewContent.tsx`
- `src/components/project/TCProjectOverview.tsx`
- `src/components/project/FCProjectOverview.tsx`
- `src/components/project/SupplierProjectOverview.tsx`

