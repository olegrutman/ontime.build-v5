

# Unified Work Order Wizard — Implementation Plan

This is a very large feature (~30+ files, 5+ migrations) that replaces two existing wizards (WorkOrderWizard + FCWorkOrderDialog) with a single role-adaptive wizard, adds 3 new database tables, extends 3 existing tables, and creates a WO detail page.

## Phased Approach

Due to the scale, this must be implemented in phases across multiple messages. The plan covers all phases but implementation will proceed incrementally.

---

## Phase 1: Database Schema Changes

### Migration 1: New columns on `change_order_projects`

```sql
ALTER TABLE public.change_order_projects
  ADD COLUMN wo_mode TEXT,
  ADD COLUMN wo_request_type TEXT,
  ADD COLUMN tc_labor_rate DECIMAL,
  ADD COLUMN fc_labor_rate DECIMAL,
  ADD COLUMN use_fc_hours_at_tc_rate BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN materials_markup_pct DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN equipment_markup_pct DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN location_tag TEXT,
  ADD COLUMN draft_started_at TIMESTAMPTZ,
  ADD COLUMN converted_at TIMESTAMPTZ,
  ADD COLUMN submitted_by_user_id UUID REFERENCES public.profiles(id),
  ADD COLUMN gc_request_note TEXT;
```

### Migration 2: New column on `project_team`

```sql
ALTER TABLE public.project_team ADD COLUMN labor_rate DECIMAL;
```

### Migration 3: New columns on `organizations`

```sql
ALTER TABLE public.organizations
  ADD COLUMN default_materials_markup_pct DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN default_equipment_markup_pct DECIMAL NOT NULL DEFAULT 0;
```

### Migration 4: `work_order_line_items` table (replaces the role of `work_order_log_items` for the unified wizard)

The existing `work_order_log_items` table from Quick Log stays as-is. The new `work_order_line_items` table is purpose-built for the unified wizard with different columns (change_order_id linkage, group_label, location_tag vs location, different status enum, period_week as NOT NULL date).

```sql
CREATE TABLE public.work_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_order_id UUID REFERENCES public.change_order_projects(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  created_by_user_id UUID NOT NULL,
  catalog_item_id UUID REFERENCES public.work_order_catalog(id),
  item_name TEXT NOT NULL,
  division TEXT,
  category_name TEXT,
  group_label TEXT,
  unit TEXT NOT NULL,
  qty DECIMAL,
  hours DECIMAL,
  unit_rate DECIMAL NOT NULL,
  line_total DECIMAL NOT NULL DEFAULT 0,
  material_spec TEXT,
  location_tag TEXT,
  note TEXT,
  period_week DATE NOT NULL DEFAULT (date_trunc('week', now()))::date,
  status TEXT NOT NULL DEFAULT 'draft',
  added_at TIMESTAMPTZ DEFAULT now()
);
-- Trigger to compute line_total
-- RLS policies
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_line_items;
```

### Migration 5: `work_order_materials` and `work_order_equipment` tables

```sql
CREATE TABLE public.work_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_order_id UUID REFERENCES public.change_order_projects(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  created_by_user_id UUID NOT NULL,
  description TEXT NOT NULL,
  supplier TEXT,
  quantity DECIMAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'ea',
  unit_cost DECIMAL NOT NULL,
  line_cost DECIMAL NOT NULL DEFAULT 0,
  markup_percent DECIMAL NOT NULL DEFAULT 0,
  markup_amount DECIMAL NOT NULL DEFAULT 0,
  billed_amount DECIMAL NOT NULL DEFAULT 0,
  added_by_role TEXT NOT NULL,
  receipt_note TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  added_at TIMESTAMPTZ DEFAULT now()
);
-- Trigger to compute line_cost, markup_amount, billed_amount

CREATE TABLE public.work_order_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_order_id UUID REFERENCES public.change_order_projects(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  created_by_user_id UUID NOT NULL,
  description TEXT NOT NULL,
  duration_note TEXT,
  cost DECIMAL NOT NULL,
  markup_percent DECIMAL NOT NULL DEFAULT 0,
  markup_amount DECIMAL NOT NULL DEFAULT 0,
  billed_amount DECIMAL NOT NULL DEFAULT 0,
  added_by_role TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  added_at TIMESTAMPTZ DEFAULT now()
);
-- Trigger to compute markup_amount, billed_amount
-- RLS policies for both tables
```

---

## Phase 2: Types & Hooks

### `src/types/unifiedWizard.ts`
- `WOMode = 'quick_capture' | 'full_scope'`
- `WORequestType = 'request' | 'log'`
- `LineItemStatus = 'draft' | 'submitted' | 'approved' | 'disputed' | 'invoiced'`
- `WOMaterialRow`, `WOEquipmentRow` interfaces
- `UnifiedWizardData` interface for all wizard state
- Material spec dropdown maps (reuse from quickLog.ts)

### `src/hooks/useWorkOrderDraft.ts`
- Manages the active WO draft (change_order_projects record)
- CRUD for line items, materials, equipment sub-collections
- `saveDraft()` — upserts change_order_projects with status='draft'
- `convertToWorkOrder()` — runs the 10-step conversion transaction
- `financials` computed property: labor/materials/equipment totals, margin
- Auto-save logic for Quick Capture mode

### `src/hooks/useProjectLaborRates.ts`
- Reads `project_team.labor_rate` for current user's org on the project
- `saveMyRate(rate, saveToProject)` — updates project_team if checkbox checked

### Update `src/hooks/useWorkOrderCatalog.ts`
- Already exists and works. No changes needed — reuse as-is.

---

## Phase 3: Unified Wizard UI

### `src/components/unified-wo-wizard/` (new directory)

**UnifiedWOWizard.tsx** — Main wizard shell
- Full-screen dialog (desktop) with left step list + right content
- Full-screen on mobile with progress bar
- Financial summary strip always visible
- Role-aware step filtering (skip Step 0 for GC/FC)

**Steps (each a component):**
1. `IntentStep.tsx` — TC only: Request vs Log cards
2. `CaptureModeStep.tsx` — Quick Capture vs Full Scope cards
3. `ScopeStep.tsx` — Catalog browser (reuse `CatalogBrowser` from quick-log) + scope description + title (Full Scope only). Multi-select with selected items tray.
4. `LocationStep.tsx` — Chip groups pulled from project scope (buildings, levels, units, elevations, other). Multi-select. Auto-save trigger for Quick Capture.
5. `LaborStep.tsx` — Hourly/Lump sum toggle. Rate field from project_team. TC toggle for "Bill FC hours at my rate." Hours input with running total.
6. `MaterialsStep.tsx` — Material row list with TC markup columns. FC cost-only view. "Add material" button.
7. `EquipmentStep.tsx` — Same structure as materials.
8. `ReviewStep.tsx` — Read-only summary with section jump links. Submit buttons differ by mode (Quick Capture: save draft + submit; Full Scope: submit only). Line item checkboxes for partial submission.

**FinancialSummaryStrip.tsx** — Role-aware financial card (TC sees full margin, FC sees claim total, GC sees totals only)

---

## Phase 4: WO Detail Page

### `src/pages/WorkOrderDetailPage.tsx` (new)
- Route: `/work-orders/:id`
- Mirrors project overview layout using same card patterns
- Sections: Header, Attention card, Financial summary, Metric strip (3 tiles), Scope & Labor (grouped by week), Materials, Equipment, Activity feed
- Action buttons based on status + role
- GC line-item dispute UI (approve all / approve selected / reject all)

### Components in `src/components/wo-detail/`
- `WOHeroCard.tsx` — Matches ContractHeroCard style
- `WOMetricStrip.tsx` — 3 tiles (scope items, materials, equipment)
- `WOAttentionCard.tsx` — Matches UrgentTasksCard style
- `WOScopeSection.tsx` — Line items grouped by period_week
- `WOMaterialsSection.tsx` — Material rows with role-aware columns
- `WOEquipmentSection.tsx` — Equipment rows
- `WOActivityFeed.tsx` — Activity log

---

## Phase 5: Integration & Cleanup

### Modify `WorkOrdersTab.tsx`
- Replace the "New Work Order" button onClick to open UnifiedWOWizard (for all roles)
- Remove `FCWorkOrderDialog` import and rendering
- Remove `WorkOrderWizard` import and rendering (from this file only)
- Add "Draft - In Progress" badge, location_tag display, running totals on cards
- Group list by status: gc_requested → draft → submitted → approved → contracted

### Modify `useChangeOrderProject.ts`
- Add new `wo_mode`, `wo_request_type` etc. to create mutation
- Keep `createFCWorkOrder` temporarily for backward compat, mark deprecated

### Update routing
- Add route for `/work-orders/:id` → `WorkOrderDetailPage`

### Other consumers of `WorkOrderWizard`
- `RFIsTab.tsx` — Update to use UnifiedWOWizard
- `ChangeOrders.tsx` page — Update to use UnifiedWOWizard
- `DemoWorkOrdersTab.tsx` — Update import (or keep legacy for demo)

### Do NOT touch
- Existing `change_order_projects` columns (only add)
- Invoice/PO/SOV flows
- `project_activity` table structure
- Sidebar, topbar, tab structure
- ProjectTopBar, MobileProjectHeader

---

## Implementation Order

Given the scope, implementation will proceed across multiple messages:

1. **Message 1**: Database migrations (all 5) + types file
2. **Message 2**: Hooks (useWorkOrderDraft, useProjectLaborRates)
3. **Message 3**: Wizard shell + Steps 0-2 (Intent, Mode, Scope)
4. **Message 4**: Steps 3-7 (Location, Labor, Materials, Equipment, Review) + Financial Summary
5. **Message 5**: WO Detail Page + routing
6. **Message 6**: WorkOrdersTab integration, cleanup, GC dispute UI

Each message will produce working, testable code for that phase.

