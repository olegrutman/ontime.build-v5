## The gap

You want **interior siding installation — e.g., T&G wood plank on ceilings**. Today the catalog has:

- `envelope_exterior / siding_trim` → only **exterior** siding
- `demo / selective_demo / d4 Ceiling demo` → tear-out, not install
- No `interior_finish` division at all (no T&G, shiplap, beadboard, paneling, wainscot, beams, tile, drywall finish, trim)

So a TC trying to add "T&G wood ceiling install" hits a dead end. The AI fallback (`suggest-scope-items`) only ranks **existing** catalog rows, so it can't rescue you either.

## Recommended approach (two layers)

Solve it in two layers so you fix this case *and* every future "missing item" case.

### Layer 1 — Seed a real "Interior Finishes" branch (data, permanent)

Add a platform-level division so the right items appear in every project's CO wizard. Proposed taxonomy:

```text
interior_finish /
├── ceiling_finish
│   ├── if_tg_wood_ceiling      "T&G wood ceiling — install"        SF
│   ├── if_shiplap_ceiling      "Shiplap ceiling — install"         SF
│   ├── if_beadboard_ceiling    "Beadboard ceiling — install"       SF
│   ├── if_wood_plank_ceiling   "Wood plank ceiling — install"      SF
│   ├── if_decorative_beams     "Decorative ceiling beams"          LF
│   └── if_ceiling_trim         "Ceiling perimeter trim"            LF
├── wall_finish
│   ├── if_tg_wood_wall         "T&G wood wall paneling — install"  SF
│   ├── if_shiplap_wall         "Shiplap wall — install"            SF
│   ├── if_wainscot             "Wainscot — install"                SF
│   └── if_accent_wall          "Accent wood wall — install"        SF
└── prep
    ├── if_furring_strips       "Furring strips for wood ceiling"   SF
    └── if_substrate_prep       "Substrate prep / blocking"         SF
```

Each row gets:
- `applicable_zone` = `interior_ceiling` or `interior_wall`
- `applicable_work_types` = `['remodel','new_construction','repair']`
- `applicable_reasons` = `['scope_addition','design_change','owner_request']`
- `aliases` = e.g. `['t&g','tongue and groove','tongue & groove','plank ceiling','wood ceiling','tg ceiling']` — so AI search and free-text matching find them
- `is_platform = true`, `org_id = null`

This is shipped via a single migration so every org sees them immediately.

### Layer 2 — "Can't find it? Add it." escape hatch (UX, durable)

For the next time something genuinely isn't in the catalog, give users a guarded path instead of getting stuck:

1. In Step 3 (Scope) of the Add-Item wizard, when the AI fallback search returns no usable match — or always as a small secondary action — show **"+ Add custom item"**.
2. Opens a small form: **Name**, **Unit** (EA/SF/LF/HR/LS), **Division** (dropdown of existing divisions + "Other"), **Category**, optional **Quantity**, optional **Description**.
3. Two save modes:
   - **One-off** (default) → inserted into `co_line_items` with `catalog_item_id = NULL` (the schema already allows this). Tagged in UI as "Custom".
   - **Save to my org's catalog** (checkbox, only if user has org admin/owner role) → inserts an `org`-scoped row into `catalog_definitions` (`is_platform = false`, `org_id = <user's org>`), then references it from the line item. Future COs in that org will see it.
4. Custom items still flow through the AI description generator and Review step like any other line item.

This works because:
- `co_line_items.catalog_item_id` is already nullable with `ON DELETE SET NULL`.
- `catalog_definitions` already supports org-scoped rows via `is_platform=false` + `org_id`, with an existing RLS policy "Org catalog readable by members".

### Why this combination

- **Layer 1** fixes your immediate need correctly — T&G ceilings show up in the structured pick-list with proper zones, units, and AI matchability for everyone, not just one CO.
- **Layer 2** prevents this exact conversation from repeating. Any future missing item is a 20-second add, not a support ticket. Org-level promotion lets each TC build their own working library without polluting the platform catalog.
- We **don't** let users freely write into the platform catalog — only platform admins can promote an org item to platform-wide later (already manageable from `ScopeItemsTable` in the platform admin area).

## How to build

### Migration (Layer 1)

`supabase/migrations/<ts>_seed_interior_finish_catalog.sql`:

- `INSERT INTO catalog_definitions (...)` for the ~12 rows above.
- Slugs like `if_tg_wood_ceiling` so they're stable and namespaced.
- Populate `search_text` and `aliases` so the existing `suggest-scope-items` edge function ranks them on plain-English queries like "T&G wood ceiling".

No schema changes — the table already supports everything we need.

### Frontend (Layer 2)

New small component, plus one wiring change:

- **New:** `src/components/change-orders/wizard/AddCustomItemDialog.tsx`
  - Controlled dialog with the form described above.
  - On save, returns a `SelectedScopeItem` object the wizard can append to `data.selectedItems`. For one-off mode, `id` is a temporary `crypto.randomUUID()` and `catalog_item_id` is null when persisted.
  - When "Save to org catalog" is checked, calls `supabase.from('catalog_definitions').insert({...})` first, then uses the returned id as `catalog_item_id`.

- **Edit:** `src/components/change-orders/wizard/StepCatalog.tsx`
  - Add a small `+ Add custom item` button at the top of the picker and inside the empty-results state.
  - Pipe through to `AddCustomItemDialog`.

- **Edit:** `src/components/change-orders/AddScopeItemButton.tsx` → `handleSaveItems`
  - Already inserts `catalog_item_id: item.id`. Change to `catalog_item_id: item.isCustom ? null : item.id` (or use a dedicated field like `item.catalogId`) so custom one-offs persist with `null`.

- **Edit:** `src/types/changeOrder.ts` (or wherever `SelectedScopeItem` lives) — add optional `isCustom?: boolean` and `catalogId?: string | null` flags.

### Permissions

- Anyone in the org can add a **one-off** custom item (already allowed by current `co_line_items` RLS).
- Only org owner/admin (use existing `RequireOrgType`/role check) sees the **"Save to my org's catalog"** checkbox. Insert RLS on `catalog_definitions` must require `org_id = caller's org` — verify the existing policy covers this; if not, add one in the same migration.

### Out of scope

- No changes to AI prompt logic — the new catalog rows just appear in `suggest-scope-items` results once their `search_text`/`aliases` are populated.
- No changes to invoicing, SOV, or pricing — custom items already flow through the existing CO line-item pipeline.
- No new platform admin UI — `ScopeItemsTable` already lets platform staff curate and promote items.
