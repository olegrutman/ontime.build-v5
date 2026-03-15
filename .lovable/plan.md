

# Multi-Item Work Order — Implementation Plan

## Concept

Transform the current Work Order from a single-task entity into a **package container**. One Work Order header holds multiple **task line items**, each with its own location, work type, description, and scope. This mirrors how POs hold multiple material lines.

The existing `change_order_projects` table becomes the **package header**. A new `work_order_tasks` table stores individual task items inside it.

## Database Changes

### New table: `work_order_tasks`

```sql
CREATE TABLE public.work_order_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.change_order_projects(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  location_data JSONB DEFAULT '{}',
  work_type TEXT,
  reason TEXT,
  structural_element TEXT,
  scope_size TEXT,
  urgency TEXT,
  pricing_mode TEXT DEFAULT 'fixed',
  requires_materials BOOLEAN DEFAULT false,
  material_cost_responsibility TEXT,
  requires_equipment BOOLEAN DEFAULT false,
  equipment_cost_responsibility TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','complete','skipped')),
  photo_url TEXT,
  voice_note_url TEXT,
  field_capture_id UUID REFERENCES public.field_captures(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.work_order_tasks ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_tasks;
```

RLS: Same project-participant-based access as `change_order_projects` (authenticated users can INSERT own rows; project participants can SELECT/UPDATE).

### No changes to `change_order_projects`

The existing table becomes the package header as-is. Its `title`, `description`, `location_data` serve as the overall package context. Individual tasks live in the new child table.

## Frontend Components

### New directory: `src/components/work-order-tasks/`

| File | Purpose |
|------|---------|
| `WorkOrderTaskList.tsx` | List of task line items inside a work order (used on detail page) |
| `WorkOrderTaskCard.tsx` | Individual task card with status, location, work type |
| `AddTaskSheet.tsx` | Mobile-first bottom sheet to quickly add a task (reuses location/work-type selectors from wizard) |
| `TaskQuickAdd.tsx` | Minimal inline form for FC — description + location + photo, one tap to add |

### Modified files

**`WorkOrdersTab.tsx`** — No changes needed (work orders still show as cards, each is a package now).

**`ChangeOrderDetailPage.tsx`** — Add a "Tasks" section that renders `WorkOrderTaskList`. This becomes the primary content area showing all task line items inside this work order. Add a "+ Add Task" button (opens `AddTaskSheet`).

**`WorkOrderWizard.tsx`** — After creating the header, offer to "Add First Task" which opens `AddTaskSheet`. The wizard itself remains the header creation flow (title, assignment, pricing mode). Individual tasks are added afterwards.

**`FCWorkOrderDialog.tsx`** — After FC submits the header, auto-open `TaskQuickAdd` so they can immediately start adding tasks. The dialog's current location/description fields become the first task automatically.

### New hook: `useWorkOrderTasks(workOrderId)`

- Fetches tasks for a work order via react-query
- Realtime subscription for live updates
- Mutations: `addTask`, `updateTask`, `deleteTask`, `reorderTasks`
- `addTask` accepts partial data (description only is valid for quick field capture)

## UX Flow

### GC/TC Flow
1. Click "New Work Order" → Wizard creates header (title, assignment, pricing mode)
2. Land on Work Order detail page
3. Click "+ Add Task" → `AddTaskSheet` opens with location, work type, description, scope fields
4. Repeat to add more tasks throughout the day
5. Each task shows its own status chip (pending → in_progress → complete)

### FC Flow (Field-Optimized)
1. Click "Submit Work Order" → FC Dialog creates header
2. Current FC dialog fields (location, description, hours) become the **first task** automatically
3. On the detail page, FC sees task list with big "+ Add Task" button
4. `TaskQuickAdd`: description + photo + location dropdown, one tap save
5. FC can keep adding tasks all day from the detail page

### Field Capture Integration
- "Convert to Work Order" creates a header + first task pre-filled from capture data
- Additional captures can be converted to tasks inside an existing work order via "Add to Existing WO" option

## Task Card Design (Mobile-First)

```text
┌──────────────────────────────────┐
│ ● Pending    Floor 2 / Kitchen   │
│ Re-frame header above doorway    │
│ [📷] [Materials] [Equipment]     │
│                          ⋮ menu  │
└──────────────────────────────────┘
```

- Status dot (color-coded), location badge, description
- Media/resource icons as small badges
- Overflow menu: Edit, Mark Complete, Delete

## Summary

This adds a child `work_order_tasks` table to the existing `change_order_projects` system, keeping all current functionality intact while enabling multiple tasks per work order. The detail page gets a new Tasks section, and both the GC wizard and FC dialog are updated to create the first task inline. Additional tasks can be added anytime from the detail page.

