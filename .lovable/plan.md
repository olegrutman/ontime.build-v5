

# Interactive Project Scheduling Module — Desktop Gantt + Mobile Cards

## Scope

Replace the current basic SVG Gantt chart with a full-featured interactive scheduling module: an enhanced desktop Gantt chart with zoom, cascade confirmation, dependency arrows, and a detail drawer; plus a completely different mobile card-based view. Both share one unified data layer.

## Architecture

```text
ScheduleTab.tsx (orchestrator)
├── useProjectSchedule.ts (data layer — exists, extend)
├── cascadeSchedule.ts (NEW — pure utility for dependency graph walking)
├── Desktop (≥768px)
│   ├── GanttChart.tsx (REWRITE — zoom, badges, critical path)
│   ├── GanttToolbar.tsx (NEW — zoom toggle, critical path toggle)
│   ├── TaskDetailDrawer.tsx (NEW — right-side Sheet)
│   └── CascadeConfirmDialog.tsx (NEW — modal for downstream changes)
└── Mobile (<768px)
    ├── MobileScheduleView.tsx (NEW — sticky bar + grouped cards)
    ├── PhaseCardGroup.tsx (NEW — collapsible phase sections)
    ├── TaskCard.tsx (NEW — individual card with mini-bar, ±1 day, date picker)
    └── CascadeBottomSheet.tsx (NEW — full-screen bottom sheet for cascade confirm)
```

## Key Changes

### 1. Cascade Utility — `src/utils/cascadeSchedule.ts`
Pure function: given items array, a changed task ID, and its new start/end dates, walk `dependency_ids` graph and return map of `{ id → { start_date, end_date } }` for all downstream tasks. Supports optional buffer days per task. Used by both desktop and mobile.

### 2. Desktop Gantt Rewrite — `GanttChart.tsx`
- **Zoom levels**: Day/Week/Month toggle changes `DAY_WIDTH` and header labels. Controlled via `GanttToolbar.tsx`.
- **Duration source badge**: Small "A" (auto) or pencil icon on each bar, based on whether `sov_item_id` exists and end_date matches estimated duration.
- **Drag tooltip**: Already exists — enhance to show duration in days.
- **Dependency arrows**: Already exists — keep as-is with bezier curves.
- **Cascade on drag end**: After drag completes, check if moved task has downstream dependents. If yes, show `CascadeConfirmDialog` with three options: Cascade All / Keep Others / Cancel. If "Keep Others", flag conflicting tasks with red bar + warning icon.
- **Critical path toggle**: Highlight the longest chain of dependent tasks in amber/gold. Computed by finding the path with maximum total duration through the dependency graph.
- **Click opens drawer**: Replace the current full modal (`ScheduleItemForm`) with a right-side `Sheet` (`TaskDetailDrawer`) showing name, dates, duration, dependencies, auto/manual toggle.
- **Undo**: After any drag, show a toast with "Undo" button for 5 seconds. Store previous state snapshot, restore on click.

### 3. Mobile Card View — `MobileScheduleView.tsx`
- **Sticky top bar**: Project start date, end date, total days remaining.
- **Phase grouping**: Group tasks by `item_type === 'phase'` or infer from SOV categories. Collapsible `Collapsible` sections with total phase duration in header.
- **TaskCard**: Card per task showing name, color-coded category, date range, duration, status pill (derived from progress: 0% = Not Started, 1-99% = In Progress, 100% = Complete).
  - Mini timeline bar: proportional indicator showing where this task falls relative to project start/end.
  - Two large buttons: `[−1 day]` `[+1 day]` to adjust duration.
  - Calendar icon opens a `Popover` date picker to change start date.
- **Cascade bottom sheet**: Uses `vaul` Drawer component for full-screen bottom sheet confirmation when changes affect downstream tasks.

### 4. ScheduleTab.tsx Updates
- Use `useIsMobile()` hook to conditionally render `GanttChart` (desktop) or `MobileScheduleView` (mobile).
- Move shared state (undo stack, cascade pending state) to this level.
- Add optimistic updates: update local state immediately on drag, revert if DB write fails.

### 5. Data Layer — `useProjectSchedule.ts`
- Add `buffer_days` field support (if column exists, otherwise default to 0).
- No new DB columns required — `dependency_ids`, `start_date`, `end_date` already exist.
- Add a `conflict` transient flag on items for red highlighting.

### Files Summary

| File | Action |
|------|--------|
| `src/utils/cascadeSchedule.ts` | NEW — cascade + critical path utilities |
| `src/components/schedule/GanttToolbar.tsx` | NEW — zoom + critical path toggles |
| `src/components/schedule/TaskDetailDrawer.tsx` | NEW — right-side drawer |
| `src/components/schedule/CascadeConfirmDialog.tsx` | NEW — desktop cascade modal |
| `src/components/schedule/MobileScheduleView.tsx` | NEW — mobile orchestrator |
| `src/components/schedule/PhaseCardGroup.tsx` | NEW — collapsible phase section |
| `src/components/schedule/TaskCard.tsx` | NEW — mobile task card |
| `src/components/schedule/CascadeBottomSheet.tsx` | NEW — mobile cascade sheet |
| `src/components/schedule/GanttChart.tsx` | REWRITE — zoom, badges, cascade, critical path, undo |
| `src/components/schedule/ScheduleTab.tsx` | UPDATE — mobile/desktop split, shared state |
| `src/components/schedule/ScheduleItemForm.tsx` | KEEP — used as fallback, drawer replaces primary use |

No database migrations needed. All existing columns support the new features.

