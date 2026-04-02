

# Platform Data Manager — Edit Setup Questions & Lists

## What It Is
A new "Data Manager" section on the `/platform/setup` page that gives platform owners full CRUD control over the 6 reference tables that drive project setup. Currently these are read-only seed data with no UI to manage them.

## Tables Managed

| Tab Label | Table | Key Columns | Row Count |
|-----------|-------|-------------|-----------|
| Project Types | `project_types` | name, slug, flags, defaults | 7 |
| Scope Sections | `scope_sections` | slug, label, display_order, required_feature | 17 |
| Scope Items | `scope_items` | label, section_id, item_type, default_on, display_order, filters | 134 |
| Contract Categories | `contract_scope_categories` | slug, label, display_order | 13 |
| Trades | `trades` | name + any other columns | 15 |
| SOV Templates | `sov_templates` | template_key + columns | 6 |

## Database Changes (Migration)

Add INSERT, UPDATE, DELETE RLS policies on all 6 tables, gated by `is_platform_staff(auth.uid())`. The existing SELECT policies remain unchanged.

```sql
-- Example pattern for each table:
CREATE POLICY "Platform staff can insert" ON public.scope_items
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can update" ON public.scope_items
  FOR UPDATE TO authenticated USING (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can delete" ON public.scope_items
  FOR DELETE TO authenticated USING (public.is_platform_staff(auth.uid()));
```

Repeat for all 6 tables.

## New Files

| File | Purpose |
|------|---------|
| `src/components/platform/PlatformDataManager.tsx` | Tabbed container with 6 tabs |
| `src/components/platform/data-tables/ProjectTypesTable.tsx` | Editable table for project_types |
| `src/components/platform/data-tables/ScopeSectionsTable.tsx` | Editable table for scope_sections |
| `src/components/platform/data-tables/ScopeItemsTable.tsx` | Editable table with section filter dropdown |
| `src/components/platform/data-tables/ContractCategoriesTable.tsx` | Editable table for contract_scope_categories |
| `src/components/platform/data-tables/TradesTable.tsx` | Editable table for trades |
| `src/components/platform/data-tables/SOVTemplatesTable.tsx` | Editable table for sov_templates |
| `src/hooks/usePlatformDataTables.ts` | Generic CRUD hooks for platform reference tables |

## UI Design

Each tab renders:
1. **Header row** — table name, description, "Add Row" button
2. **Data grid** — one row per record, inline-editable cells:
   - Text fields: click to edit
   - Booleans: toggle switches
   - Arrays (like `excluded_project_types`): multi-select chips
   - `display_order`: drag handle or up/down arrows
   - Foreign keys (like `section_id` on scope_items): dropdown selector showing parent label
3. **Row actions** — Save (per-row) and Delete (with confirmation dialog)
4. **Section filter** on Scope Items tab — dropdown to filter by parent scope_section

## Modified Files

| File | Change |
|------|--------|
| `src/pages/platform/PlatformSetup.tsx` | Add `<PlatformDataManager />` below existing settings cards |
| Migration SQL | Add write RLS policies on 6 tables |

## How the CRUD Hook Works

A single generic hook pattern:
```typescript
function usePlatformTable<T>(tableName: string) {
  // useQuery: SELECT * ORDER BY display_order/name
  // useInsert: INSERT with defaults
  // useUpdate: UPDATE by id
  // useDelete: DELETE by id (with FK safety check)
}
```

Each table component calls this hook with its table name and renders the appropriate columns.

