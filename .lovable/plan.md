

# Auto-Estimate Durations + Drag-to-Resize on Gantt

## What this does

1. **Auto-populate estimated durations** for every SOV schedule task based on industry-standard residential wood-frame construction timelines. Tasks that currently have no end date (most of them) get a sensible default.

2. **Drag-to-resize bars on the Gantt chart** so the user can grab the left or right edge of any bar and drag to adjust start/end dates visually. Changes save immediately to the database.

## Industry Duration Estimates

Based on the SOV items in this project (multi-story wood-frame residential), here are the standard estimates:

| Task Pattern | Duration (business days) |
|---|---|
| Walls Frame (per floor) | 3-5 days |
| Wall Sheathing (per floor) | 2-3 days |
| Trusses (per floor) | 2-3 days |
| Truss Sheathing (per floor) | 2-3 days |
| Backout/Blocking (per floor) | 2 days |
| Hardware Installation (per floor) | 1-2 days |
| Shim and Shave (per floor) | 2 days |
| Inspection (per floor) | 1 day |
| Final Punch (per floor) | 1-2 days |
| Tyvek Install | 2-3 days |
| Windows Install | 3-5 days |
| Siding (per side) | 3-5 days |
| Roof Trusses | 3 days |
| Roof Truss Sheathing | 2-3 days |
| Pool Room | 5 days |

## Implementation

### 1. Duration estimation utility (`src/utils/scheduleEstimates.ts` — new file)

A function `estimateDuration(taskName: string, valueAmount: number): number` that pattern-matches the task name to return business days. Uses value amount as a secondary signal (higher value → longer duration within range). Returns a sensible default (3 days) for unrecognized names.

### 2. "Auto-Estimate" button on ScheduleTab

Add a button in the toolbar: "Auto-Estimate Dates". When clicked:
- Finds all schedule items with no end date (or where start === today, meaning un-scheduled)
- Sequences them logically: per-floor tasks in construction order, then cross-cutting tasks
- Sets `start_date` and `end_date` using the estimates, chaining tasks so they don't all start on the same day
- Batch-updates via `updateItem`

### 3. Drag-to-resize on Gantt bars (`GanttChart.tsx`)

Add mouse interaction to task/phase bars:
- **Right edge drag**: changes `end_date` — cursor shows `col-resize`, a ghost bar follows the mouse, on mouseup the new end date is calculated from pixel position and `onUpdate` is called
- **Left edge drag**: changes `start_date` similarly
- **Whole bar drag**: shifts both dates (move, not resize)

New prop: `onUpdate: (id: string, updates: { start_date?: string; end_date?: string }) => void`

The drag is implemented with `onMouseDown` on thin invisible hit-target rects at bar edges (6px wide), tracking mouse movement via `onMouseMove`/`onMouseUp` on the SVG element.

### Files

| File | Change |
|---|---|
| `src/utils/scheduleEstimates.ts` | New — duration lookup by task name |
| `src/components/schedule/ScheduleTab.tsx` | Add "Auto-Estimate" button, wire `onUpdate` to Gantt |
| `src/components/schedule/GanttChart.tsx` | Add drag-to-resize/move on bars |

No database changes needed.

