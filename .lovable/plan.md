

# Here's What I Understand (Plain English)

You want three things:

1. **Clickable schedule tasks from SOV**: When a schedule task was auto-created from an SOV line item, clicking on it in the table should open a simplified edit form. The task name should match the SOV line item name exactly. The form should only show **start date** and **end date** — no type selector, no work order picker, no dependencies list. The SOV item link should be automatically set (defaulted) and not changeable.

2. **Progress bar on the Schedule tab**: Add an overall progress indicator at the top of the Schedule tab showing how far along the project schedule is (average progress across all items).

3. **Collapsible schedule sections**: Allow the user to collapse/expand the Gantt chart and the table so they can hide parts they don't need at the moment.

---

## Plan

### 1. Simplified SOV-linked task form (`ScheduleItemForm.tsx`)

When editing a task that has a `sov_item_id`:
- Hide: Type selector, Work Order link, SOV Item selector, Dependencies list
- Show: Title (read-only, matching SOV item name), Start Date, End Date, Progress slider
- The SOV link stays locked — user can't change it

Detection: `item?.sov_item_id` is truthy → render simplified layout.

### 2. Clickable rows open edit form (`ScheduleTab.tsx`)

Currently clicking a row only highlights it (`setSelectedId`). Change it so clicking a row also opens the edit form (calls `handleEdit`). The pencil button becomes redundant for row clicks but can stay for clarity.

### 3. Overall progress bar (`ScheduleTab.tsx`)

Add a progress bar in the toolbar area showing the average progress across all schedule items. Use the existing `Progress` component. Display as "Overall: X%" with the bar.

### 4. Collapsible Gantt and Table sections (`ScheduleTab.tsx`)

Wrap the Gantt chart and the Table each in a `Collapsible` component with a toggle header ("Gantt Chart" / "Schedule Items"). Both default to open. User can collapse either independently.

### Files to modify

| File | Change |
|------|--------|
| `src/components/schedule/ScheduleTab.tsx` | Click row → open edit form; add overall progress bar; wrap Gantt + Table in Collapsible |
| `src/components/schedule/ScheduleItemForm.tsx` | Detect SOV-linked items and show simplified form (dates + progress only) |

No database changes needed.

