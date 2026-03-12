

# Enhance Dashboard Project Expansion with Schedule Items and Financial Tiles

## What I Understand

Right now, when you expand a project card on the dashboard, you see a flat list of action chips ("2 tasks overdue", "1 invoice unpaid") and a tiny one-line metrics row. It's functional but missing two things you had before and want back:

1. **Critical schedule items with actual task names** -- not just "2 tasks overdue" as a chip, but the individual task titles with OVERDUE/DUE SOON badges and progress bars, like the CriticalScheduleCard already does on the project overview page.

2. **Financial summary as proper tiles/cards** -- Budget vs Billed, Outstanding, Schedule % shown as mini KPI cards instead of a cramped text row.

## What Will Change

### Section 1: Action Alerts (keep, but remove schedule chips)
Keep the role-aware action chips for invoices, WOs, POs, and RFIs. Remove the "X tasks overdue" and "X tasks due this week" chips since those will now be shown as actual schedule items below.

### Section 2: Critical Schedule Items (new)
Embed a compact version of the CriticalScheduleCard directly in the expansion. This shows:
- Each overdue/due-soon task by name
- OVERDUE (red) or "3d" (amber) badge
- Progress bar per task
- Tappable to navigate to schedule tab
- Max 3 items to keep it compact, with a "View all" link if more exist

### Section 3: Financial Tiles (replace metrics row)
Replace the tiny text row with 2-3 mini KPI cards in a horizontal grid:
- **Billed / Contract** -- e.g. "$35K / $120K" with a small progress indicator
- **Outstanding** -- unpaid amount highlighted
- **Schedule Progress** -- percentage with ahead/behind indicator

These use the same data already fetched by `useProjectQuickStats`.

### Section 4: View Full Project button (keep)

## Files to Change

| File | Change |
|------|--------|
| `src/components/dashboard/ProjectQuickOverview.tsx` | Remove schedule-related action chips. Add inline critical schedule section (reuse logic from CriticalScheduleCard). Replace compact metrics row with mini KPI tile cards. |
| `src/hooks/useProjectQuickStats.ts` | Add `criticalScheduleItems` array (title, end_date, progress, isOverdue, daysUntil) to the returned stats so the overview can render them directly without a second hook call. Remove schedule items from `actionItems` array. |

No changes needed to `ProjectRow.tsx` or the hook's queries -- the schedule data is already fetched.

