

# Quick Log — Work Order Task Logging System

## Scope

This is a large feature with ~20 new files. It adds a fast-entry "Quick Log" mode alongside the existing work order wizard inside the Work Orders tab, plus a mode toggle in the Field Capture sheet.

---

## 1. Database Changes (2 migrations)

### Migration 1: `work_order_catalog` table + seed data

```sql
CREATE TABLE public.work_order_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  group_id TEXT NOT NULL,
  group_label TEXT NOT NULL,
  item_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  category_color TEXT,
  category_bg TEXT,
  category_icon TEXT,
  sort_order INT DEFAULT 0,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.work_order_catalog ENABLE ROW LEVEL SECURITY;
-- RLS: global items (org_id IS NULL) readable by all authenticated; org-specific by org members
```

Seed all ~160 catalog items from the spec (Framing, Exterior Skin, Roofing, Waterproofing, Windows & Doors, Decorative divisions).

### Migration 2: `work_order_log_items` table

```sql
CREATE TABLE public.work_order_log_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  catalog_item_id UUID REFERENCES public.work_order_catalog(id),
  item_name TEXT NOT NULL,
  division TEXT NOT NULL,
  category_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  qty DECIMAL,
  hours DECIMAL,
  unit_rate DECIMAL NOT NULL,
  line_total DECIMAL GENERATED ALWAYS AS (COALESCE(qty, hours) * unit_rate) STORED,
  material_spec TEXT,
  location TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  linked_change_order_id UUID REFERENCES public.change_order_projects(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  period_week DATE GENERATED ALWAYS AS (date_trunc('week', created_at)::date) STORED
);
ALTER TABLE public.work_order_log_items ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_log_items;
```

RLS: project participants can SELECT; authenticated users can INSERT their own rows (created_by_user_id = auth.uid()); users can UPDATE own open items only. Status validation trigger for valid transitions.

---

## 2. New Hooks

### `src/hooks/useWorkOrderCatalog.ts`
- Fetches `work_order_catalog` (global + user's org items)
- Organizes into nested structure: division → category → group → items
- `search(query)` returns flat results with path metadata
- Memoized, cached via react-query

### `src/hooks/useWorkOrderLog.ts`
- Fetches `work_order_log_items` for project + org
- Realtime subscription for live KPI updates
- Mutations: `logItem`, `submitAllOpen`, `updateStatus`
- `submitAllOpen`: updates all open items to `submitted_to_tc` (FC) or `submitted_to_gc` (TC), creates a draft change order linking them
- Computed: `openCount`, `submittedCount`, `approvedCount`, `openTotal`

---

## 3. New Components: `src/components/quick-log/`

### `QuickLogView.tsx` — Main container
- Two-column layout (desktop), single-column stacked (mobile)
- Left: KPI strip + Alert banner + Catalog card + Logged items list
- Right (sticky): Detail panel
- Receives `projectId`, `orgId`, role info

### `QuickLogKPIStrip.tsx`
- Three metric cards: Open (amber), With TC/GC, Approved (green)
- Uses counts from `useWorkOrderLog`

### `QuickLogAlertBanner.tsx`
- Role-specific messaging with action button
- FC: "X unsubmitted" → "Submit →"
- TC: "X FC tasks not sent to GC — $Y" → "Bundle & send →"
- GC: "X requests awaiting estimate" → "Follow up →"

### `CatalogBrowser.tsx` — 4-level drill-down catalog
- Search bar at top with flat results showing `division › category › group` path
- Breadcrumb navigation (tappable segments)
- Level 1: Division tiles (3×2 grid, colored icons)
- Level 2: Category rows (icon, name, counts)
- Level 3: Sub-group tiles (2-column grid, colored dots)
- Level 4: Item list with unit labels, circular checkboxes, amber selected state
- State: `selectedItemId` lifted to parent

### `QuickLogDetailPanel.tsx` — Right panel / bottom sheet
- Empty state: "Select a task from the catalog"
- Selected state: header strip, qty/hours field (based on unit), rate field (always empty, required), material/spec dropdown (category-specific), location chips (single-select), note textarea, line total preview (amber pill), submit button
- GC-only: Send To chips (Trade Co. / Field Crew) + Priority chips (Normal / Urgent)
- Submit disabled until qty/hours AND rate > 0
- On submit: insert via `logItem`, toast, clear fields but keep catalog position

### `LoggedItemsList.tsx`
- Card "Open this period" with unsubmitted count + total
- List of items: colored left bar, item name, meta line, amount, status badge
- Footer: count + total, "Submit All Open →" button
- Hidden for GC; GC sees request history card instead

### `SubmitAllSheet.tsx`
- Confirmation bottom sheet grouping items by division
- Shows total, confirm button
- On confirm: calls `submitAllOpen`

### `QuickLogMobileSheet.tsx`
- Bottom sheet wrapper for detail panel on mobile (<768px)
- Triggered when item selected in catalog
- Submit button pinned to bottom

---

## 4. Modified Files

### `WorkOrdersTab.tsx`
- Add mode toggle state: `'orders' | 'quicklog'`
- Add "Quick Log" button next to "New Work Order" in the header area
- When `mode === 'quicklog'`, render `<QuickLogView>` instead of the work orders list
- Keep all existing wizard/dialog code untouched

### `FieldCaptureSheet.tsx`
- Add a toggle at top of the sheet body: "Note" (current behavior) | "Quick Log"
- When "Quick Log" selected, show a simplified inline version: catalog search → item select → qty + rate fields → submit
- Reuse `CatalogBrowser` in compact mode and `QuickLogDetailPanel` inline

### `FieldCaptureCard.tsx`
- No changes needed (convert button stays as-is)

---

## 5. Types

### `src/types/quickLog.ts`
- `CatalogItem`, `CatalogDivision`, `CatalogCategory`, `CatalogGroup`
- `LogItem` matching the DB schema
- `LogItemStatus = 'open' | 'submitted_to_tc' | 'submitted_to_gc' | 'approved' | 'invoiced'`
- Material spec options map by category

---

## Files Summary

**New files (~15):**
- `src/types/quickLog.ts`
- `src/hooks/useWorkOrderCatalog.ts`
- `src/hooks/useWorkOrderLog.ts`
- `src/components/quick-log/QuickLogView.tsx`
- `src/components/quick-log/QuickLogKPIStrip.tsx`
- `src/components/quick-log/QuickLogAlertBanner.tsx`
- `src/components/quick-log/CatalogBrowser.tsx`
- `src/components/quick-log/QuickLogDetailPanel.tsx`
- `src/components/quick-log/LoggedItemsList.tsx`
- `src/components/quick-log/SubmitAllSheet.tsx`
- `src/components/quick-log/QuickLogMobileSheet.tsx`
- `src/components/quick-log/index.ts`
- 2 migration files

**Modified files (2):**
- `src/components/project/WorkOrdersTab.tsx` — mode toggle + QuickLogView render
- `src/components/field-capture/FieldCaptureSheet.tsx` — Note/Quick Log toggle

**Not changed:** WorkOrderWizard, FCWorkOrderDialog, change_order_projects schema, invoice flows, WorkOrdersTab overall structure.

