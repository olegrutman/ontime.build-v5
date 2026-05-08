## Goal

When the user picks a **System** in the CO wizard (Wall, Floor, Roof, Ceiling, Exterior Envelope, Openings, Deck, Stair, Other), the **★ Suggested** bucket should fill with items that actually belong to that system. Today it's always empty because the UI sends `wall` / `floor` / `roof` while the catalog stores unrelated tags like `framing`, `sheathing`, `wrb`. We'll bridge them with a proper schema column tied to the same 9 IDs the UI uses.

## Why option 2 over a JS mapping

A mapping layer in the client would work, but:
- Every new catalog item would need someone to remember the mapping.
- The same logic would have to be duplicated wherever else the catalog is filtered (search, AI scope, future reports).
- The `catalog_definitions` table already has `applicable_zone`, `applicable_work_types`, `applicable_reasons` — adding a parallel `applicable_systems` field is the consistent pattern.

## Plan

### 1. Schema change (migration)

Add a new column to `public.catalog_definitions`:

```
applicable_systems text[] NOT NULL DEFAULT '{}'
```

Allowed values (free-form text array — same convention as the existing `applicable_*` columns):
`floor`, `wall`, `roof`, `ceiling`, `exterior`, `openings`, `deck`, `stair`, `other`

Add a GIN index on the new column so future filters stay cheap:
```
CREATE INDEX idx_catalog_definitions_applicable_systems
  ON public.catalog_definitions USING GIN (applicable_systems);
```

### 2. Backfill the 122 existing items

Mapping is driven by `division` + `category`:

```text
demo / selective_demo            → all 9 systems (demo applies anywhere)
fix / corrections                → all 9 systems (generic fixes)
general / misc                   → all 9 systems (site cleanup, bracing, etc.)

framing / floors                 → floor
framing / walls                  → wall
framing / soffits                → ceiling
framing / openings               → openings
framing / stairs                 → stair
framing / blocking               → wall, floor, ceiling
framing / enclosures             → wall

sheathing / general              → wall, floor, roof
sheathing / shear_structural     → wall

structural / beams               → floor, ceiling, roof
structural / columns             → floor, wall
structural / connectors          → floor, wall, roof, ceiling
structural / shear_lateral       → wall
structural / repair              → floor, wall, roof, ceiling

envelope_exterior / siding_trim          → exterior
envelope_exterior / deck_pergola_fence   → deck
envelope_exterior / other                → exterior

envelope_wrb / membrane          → exterior, roof
envelope_wrb / flashing          → exterior, roof, openings
envelope_wrb / openings          → openings
envelope_wrb / inspection        → exterior, wall, roof

interior_finish / wall_finish    → wall
interior_finish / ceiling_finish → ceiling
interior_finish / prep           → wall, ceiling
```

The backfill runs as a series of `UPDATE … SET applicable_systems = ARRAY[…]` statements scoped by `division` + `category`, all inside the same migration. After the backfill, every row has at least one system (no item left empty).

### 3. Frontend filter wiring

`src/hooks/useScopeCatalog.ts`:
- Extend `CatalogDefinition` type and `FilterContext` with `applicable_systems` and a `system` field.
- In `filterByContext`, add a `systemOk` check that mirrors `workTypeOk`:
  ```ts
  const systemOk =
    !system ||
    def.applicable_systems.length === 0 ||
    def.applicable_systems.includes(system);
  ```
- Promote `system` matches into the **Primary** scoring (same +1 weight as workType).

`src/components/change-orders/picker-v3/ScopeCatalogBrowser.tsx`:
- Pass `system: cur.system` into the filter context (the existing `workType: cur.system` line was wrong — keep it for backward compat or rename, see below).

### 4. Cleanup of the existing `workType` confusion

The current code passes the UI system id (`wall`) as `workType` into `filterByContext`. Once `system` is wired, we will:
- Stop passing `cur.system` as `workType`.
- Leave `applicable_work_types` alone (it's still used for tags like `framing`, `demo`, `repair` and could be set later from the cause/reason context — out of scope here).

### 5. Verification

After the migration + frontend change:
1. Open Fuller Residence → New CO → pick **Main Floor** + **Wall System** + **Plan Revision**.
   - Expect ★ Suggested to contain framing/walls items, sheathing/wall items, structural/shear_lateral, interior wall_finish.
   - Expect Related to contain demo, corrections, misc.
2. Switch System to **Floor System** → Suggested swaps to floor framing, beams, floor connectors.
3. Switch to **Roof System** → membrane, flashing, roof beams, roof sheathing show up.

## Out of scope

- No change to `applicable_work_types`, `applicable_zone`, or `applicable_reasons`.
- No changes to AI scope description or downstream CO detail page.
- No new admin UI to edit `applicable_systems` per item — backfill is one-shot; future items default to `'{}'` (which means "matches any system" by the rule above) and can be tightened later.
