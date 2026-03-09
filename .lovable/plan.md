

# Critical Schedule Card — Overview + Daily Log

## What it does

A compact card showing schedule items that are **overdue** or **due soon** (next 7 days), highlighting items that need immediate attention. Displays task name, due date, progress, and a status indicator (overdue/due soon). Tapping navigates to the Schedule tab.

---

## Design (matching existing card patterns)

```text
┌────────────────────────────────────────┐
│ 🔴 Critical Schedule                   │
├────────────────────────────────────────┤
│ ▶ 1st Floor Framing         Due: Mar 5│
│   ████████░░░░░░░░░ 40%      OVERDUE   │
├────────────────────────────────────────┤
│ ▶ Rough-In Electrical      Due: Mar 12│
│   ██████████████░░░ 70%      5 DAYS    │
└────────────────────────────────────────┘
```

- **Overdue**: `end_date < today` AND `progress < 100` → red badge
- **Due Soon**: `end_date` within 7 days AND `progress < 100` → amber badge
- Progress bar + percentage
- Tap row → navigate to Schedule tab
- Empty state: "No critical items" with green checkmark

---

## Implementation

### 1. Create `CriticalScheduleCard.tsx`

New component at `src/components/project/CriticalScheduleCard.tsx`:

- Props: `projectId`, `onNavigate`, `maxItems?` (default 5)
- Uses `useProjectSchedule(projectId)` hook
- Filters items: overdue OR due within 7 days, not 100% complete
- Sorts by urgency (overdue first, then by end_date)
- Shows progress bar, due date, status badge
- Clickable rows → `onNavigate('schedule')`

### 2. Add to Overview tab

In `ProjectHome.tsx`, add the card in the left column (after WorkOrderSummaryCard/BudgetTracking grid):

```tsx
<CriticalScheduleCard projectId={id!} onNavigate={handleTabChange} />
```

### 3. Add to Daily Log

In `DailyLogPanel.tsx`, add the card between the date nav and WeatherCard:

```tsx
<CriticalScheduleCard projectId={projectId} onNavigate={(tab) => window.location.href = `?tab=${tab}`} />
```

---

## Files to modify

| Action | File |
|--------|------|
| Create | `src/components/project/CriticalScheduleCard.tsx` |
| Edit | `src/pages/ProjectHome.tsx` (add to overview) |
| Edit | `src/components/daily-log/DailyLogPanel.tsx` (add to daily log) |
| Edit | `src/components/project/index.ts` (export) |

