

# Project Scheduling / Gantt Chart

## Database

New `project_schedule_items` table:

```sql
CREATE TABLE public.project_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'task', -- 'milestone', 'task', 'phase'
  start_date DATE NOT NULL,
  end_date DATE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  dependency_ids UUID[] DEFAULT '{}',
  work_order_id UUID REFERENCES public.change_order_projects(id) ON DELETE SET NULL,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_schedule_items ENABLE ROW LEVEL SECURITY;

-- RLS: project team members can read/write
CREATE POLICY "Team members can view schedule"
  ON public.project_schedule_items FOR SELECT TO authenticated
  USING (project_id IN (
    SELECT project_id FROM public.project_team WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can manage schedule"
  ON public.project_schedule_items FOR ALL TO authenticated
  USING (project_id IN (
    SELECT project_id FROM public.project_team WHERE user_id = auth.uid()
  ));
```

## New Files

1. **`src/hooks/useProjectSchedule.ts`** — CRUD hook using react-query + supabase for schedule items. Fetches items by project_id, provides `addItem`, `updateItem`, `deleteItem` mutations.

2. **`src/components/schedule/GanttChart.tsx`** — Custom SVG-based Gantt chart (no external library needed). Renders:
   - Time axis (days/weeks) with auto-scaling
   - Bars for tasks/phases colored by type
   - Diamond markers for milestones
   - Dependency arrows between items
   - Progress fill inside bars
   - Click to select, drag to resize dates

3. **`src/components/schedule/ScheduleTab.tsx`** — Main tab wrapper containing:
   - Toolbar: Add Task / Add Milestone / Add Phase buttons, date range zoom controls
   - Split view: left table (title, dates, progress, linked WO) + right Gantt visualization
   - Inline editing of title, dates, progress
   - Link a schedule item to an existing work order via dropdown
   - Delete with confirmation

4. **`src/components/schedule/ScheduleItemForm.tsx`** — Dialog form for creating/editing items (title, type, start/end date, progress, dependency selection, WO link).

## Integration Points

- **ProjectTopBar.tsx**: Add "Schedule" tab between "Estimates" and "Invoices" (desktop)
- **BottomNav.tsx**: Add "Schedule" to the `moreProjectItems` array
- **ProjectHome.tsx**: Add `activeTab === 'schedule'` rendering `<ScheduleTab projectId={id!} />`
- **project/index.ts**: No change needed (schedule lives in its own `components/schedule/` directory)

## Gantt Chart Design

- Pure SVG/HTML — no external dependency needed
- Left panel: sortable table with columns [Title, Type, Start, End, Progress, WO Link]
- Right panel: horizontal bar chart with day/week grid
- Milestones render as diamonds on their start date
- Dependencies render as simple arrows from end of predecessor to start of successor
- Color coding: phases = blue, tasks = green, milestones = amber
- Responsive: on mobile, shows list view only with a toggle to switch to chart view
- Progress shown as a darker fill within each bar

## Work Order Integration

- When linking a schedule item to a WO, auto-populate the title from the WO title
- Show WO status badge next to linked items
- Fetch approved/contracted WOs from `change_order_projects` for the dropdown

