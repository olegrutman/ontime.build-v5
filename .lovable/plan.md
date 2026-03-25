

# Align Project Overview to Dashboard Design

## What's Different

| Aspect | Dashboard (target) | Project Overview (current) |
|--------|-------------------|---------------------------|
| Card shell | `bg-card border border-border rounded-lg` (no shadow) | `bg-card rounded-lg border shadow-sm p-5` |
| KPI values | Inline `font-heading text-[1.5rem] md:text-[2rem] font-black` | `.kpi-value` class (2rem) |
| Labels | Inline `text-[0.7rem] uppercase tracking-[0.4px]` | `.kpi-label` class |
| Padding | `px-3.5 py-3.5` / `px-4 py-3` compact | `p-5 md:p-6` spacious |
| Card headers | `font-heading text-[1rem] font-bold` with "Details →" link | `.kpi-label` micro-label only |
| Layout gap | `gap-2.5` / `space-y-2.5` | `gap-4` / `space-y-4` |
| Sidebar width | `lg:grid-cols-[1fr_340px]` | `lg:grid-cols-[1fr_280px]` |
| Progress bars | Animated `h-1.5` bars with color coding | No progress bars |
| Tags | Colored pill badges (`bg-emerald-50 text-emerald-700`) | Inline colored text values |
| Hover effects | `hover:-translate-y-px hover:shadow-md` | None |

## Changes

### 1. `src/components/project/ContractHeroCard.tsx`
- Remove `shadow-sm` from card shells
- Change padding from `p-5 md:p-6` → `px-3.5 py-3.5`
- Replace `.kpi-label` with inline `text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground`
- Replace `.kpi-value` with inline `font-heading text-[1.5rem] md:text-[2rem] font-black tracking-tight text-foreground leading-none`
- Add hover effect: `hover:-translate-y-px hover:shadow-md transition-all duration-300`

### 2. `src/components/project/BillingCashCard.tsx`
- Remove `shadow-sm`, reduce padding to `px-3.5 py-3.5`
- Replace `.kpi-label` with inline Dashboard-style label classes
- Add card header row with title + "Details →" link pattern (matching `DashboardBudgetCard`)

### 3. `src/components/project/ProfitCard.tsx`
- Remove `shadow-sm`, reduce padding to `px-3.5 py-3.5`
- Replace `.kpi-label` with inline Dashboard label classes
- Add hover micro-interaction

### 4. `src/pages/ProjectHome.tsx`
- Change overview layout grid from `lg:grid-cols-[1fr_280px]` → `lg:grid-cols-[1fr_340px]`
- Change spacing from `gap-4` / `space-y-4` → `gap-2.5` / `space-y-2.5`

### 5. All other overview cards (`BudgetTracking`, `CriticalScheduleCard`, `UrgentTasksCard`, `TeamMembersCard`, etc.)
- Remove `shadow-sm` where present
- Tighten padding from `p-5`/`p-6` → `px-4 py-3` or `px-3.5 py-3.5`
- Replace `.kpi-label` usage with inline Dashboard label styles
- Add card header pattern: bold `font-heading text-[1rem]` title on left, action link on right

## Summary
Strip `shadow-sm`, tighten padding and gaps, replace CSS class tokens with Dashboard's inline typography, widen sidebar to 340px, and add hover micro-interactions to match the Dashboard's compact, data-dense aesthetic.

