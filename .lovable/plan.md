# AI-Driven CO/WO Scope Picker — Phase 1

> Your spec is sequenced as **Phase 1 → ship → Phase 2 → ship → Phase 3**. This plan implements **Phase 1 only** (catalog migration, zone-aware filtering, 3-tier picker UI). Phase 2 (Q&A + AI matcher) and Phase 3 (quantity/photo/refinement) become separate plans after Phase 1 is verified in the field. This matches your "Build order" section.

## What ships in Phase 1

A new `catalog_definitions` table replaces both the hardcoded 112-item list and the 256-row legacy `work_order_catalog` as the source of truth for scope items. Step 3 of the CO/WO wizard filters that catalog by **zone × reason × work-type** and shows ~6–10 relevant items by default instead of all 112. The full drill-down is preserved one tap away. Zero AI cost.

## Files

**New**
- `supabase/migrations/<ts>_catalog_definitions.sql` — table + indexes + RLS
- `supabase/migrations/<ts>_seed_catalog_definitions.sql` — 110 active rows
- `supabase/migrations/<ts>_seed_deprecated_d7_d8.sql` — 2 deprecated rows linked via `superseded_by` to w19 / w23
- `src/lib/resolveZone.ts` — pure function mapping `VisualLocationPicker` strings → 12-value `Zone` union
- `src/test/resolveZone.test.ts` — one assertion per zone branch
- `src/types/catalog.ts` — `CatalogDefinition` + `Zone` re-export

**Edited**
- `src/hooks/useScopeCatalog.ts` — query `catalog_definitions` (platform + per-org), drop `SCOPE_CATALOG` merge, add `filterByContext({zone, reason, workType})` returning `{primary, secondary, hidden}`. Keep the existing `divisions / search / allItems` shape so callers don't break.
- `src/components/change-orders/wizard/StepCatalog.tsx` — replace the "Smart picks" section with the 3-tier layout (Primary expanded, Secondary collapsed with count, Hidden = full drill-down). Search continues to span all tiers. Read-only context pills.

**Untouched**
- `VisualLocationPicker.tsx`, `COWizard.tsx`, `TMWOWizard.tsx`, `AddScopeItemButton.tsx` (consumes `StepCatalog` — no API change), `change_order_line_items` schema.

**Retired (left in repo for one release, then deleted in Phase 2 cleanup)**
- `src/lib/scopeCatalog.ts` — exports remain, but no consumer after this PR. `SMART_SUGGESTIONS` and `REASON_WORKTYPE_HINTS` are no longer read.

## Database

```text
catalog_definitions
├── id uuid PK
├── slug text UNIQUE                 (f1, s01, w01, d7, …)
├── kind text default 'scope'
├── is_platform boolean default true
├── org_id uuid → organizations(id)  (NULL for platform rows)
├── canonical_name text
├── division text                    (framing | structural | envelope_wrb | demo | sheathing | envelope_exterior | fix | general)
├── category text                    (walls | beams | flashing | …)
├── unit text                        (LF | SF | EA | LS)
├── tag text                         (structural | wrb | NULL)
├── applicable_zone text             (12-value union, see resolveZone)
├── applicable_work_types text[]
├── applicable_reasons text[]
├── search_text, aliases text[]      (reserved for Phase 2)
├── sort_order int
├── deprecated_at timestamptz
└── superseded_by uuid → catalog_definitions(id)

Indexes: slug, applicable_zone, GIN(applicable_work_types), GIN(applicable_reasons), partial(org_id)
RLS: SELECT — platform rows readable to all authenticated; org rows readable to org members
```

**Seed:** all 112 items from your spec (110 active + d7/d8 deprecated). w19 and w23 win the WRB/demo tie per your decision. The deprecation migration runs *after* the active seed so `superseded_by` can resolve.

**Legacy data:** `work_order_catalog` is **left in place untouched** so any existing CO/WO line item that references a `work_order_catalog.id` still resolves for display. New writes from the wizard go through `catalog_definitions.id` via the existing `catalog_item_id` column on `co_line_items` (which is just `text`/`uuid` — no FK change needed). No data migration of the 256 legacy rows in this phase.

## Zone resolver

`resolveZoneFromLocationTag(tag)` parses pipe/middot-delimited strings from `VisualLocationPicker` and returns one of `interior_wall | interior_floor | interior_ceiling | stairs | exterior_wall | roof | deck | envelope_opening | structural | foundation | basement | any | null`.

Rule order (first match wins, per your spec): structural keywords → exterior + (roof | deck | opening | wall) → basement (+ foundation) → attic (+ roof) → stairs → openings → floor → ceiling → interior wall → null.

## Filter behavior

`filterByContext({zone, reason, workType})` partitions items into:
- **primary** — passes all three filters (`applicable_zone === zone || 'any' || null`, reason ∈ `applicable_reasons`, workType ∈ `applicable_work_types`)
- **secondary** — passes zone but fails reason or workType
- **hidden** — everything else (full catalog via existing drill-down)

Search ignores filters and scans `allItems`.

## UI for Step 3 items phase

```text
┌─ Locked context (read-only chips) ─────────────────────────
│  📍 Interior · L2 · Master Bath · Floor joists
│  ⚠ Damaged by others
│  🏗 Framing
└────────────────────────────────────────────────────────────

┌─ ◆ For this work ─────────────────────── 6 items ─────────
│  ▢ Floor joist repair                                  LF
│  ▢ Beam repair / sister             [Structural]       LF
│  ▢ Rim joist repair / replace       [Structural]       LF
│  ▢ Subfloor repair                                     SF
│  ▢ Selective demolition                                SF
│  ▢ Damaged material removal                            SF
└────────────────────────────────────────────────────────────

▸ Related to this zone (+7 more)              (collapsed)
▸ Show everything — full catalog (92 more)    (collapsed; existing drill-down)
```

- 44px+ tap targets, multi-select checkboxes
- `tag === 'structural' | 'wrb'` rendered as inline pill
- Search bar always visible; results override tier display

## Acceptance (your Phase 1 list)

1. `catalog_definitions` has 110 active + 2 deprecated rows; `superseded_by` resolves to w19/w23.
2. `useScopeCatalog` reads from DB; per-org rows merge correctly via RLS.
3. `resolveZoneFromLocationTag` has tests for all 7 main zones.
4. Floor joists + damaged_by_others + framing → Primary shows 6–8 items, not 112.
5. "Show everything" reveals the full drill-down.
6. Search works across all tiers.
7. Three existing CO/WO records render without errors.

## Phase 2 / Phase 3 — separate plans, later

Once Phase 1 is verified in the field, paste your Part 2/3/4 prompts again and I'll plan:
- **Phase 2:** `BuildingType` resolver, 5×3 question tree, `useQuestionFlow` state machine, `StepCatalogQA` component, `suggest-scope-items` edge function via Lovable AI gateway, mode toggle (Q&A vs Type) inside Step 3.
- **Phase 3:** AI quantity auto-fill (with `quantity_source` + `ai_confidence` columns on `change_order_line_items`), photo evidence with vision captioning, location-refinement banner.

Nothing in Phase 1 blocks those — `aliases`, `search_text`, the deprecation chain, and the filter API are all designed for them.

## Open questions resolved upfront

- **w19/d7, w23/d8 dup:** WRB side wins (keep w19, w23) — per your spec.
- **Per-org catalog editing:** deferred, no admin UI in Phase 1 — per your spec.
- **Legacy `work_order_catalog`:** keep in DB untouched so historic line items still display; new writes go to `catalog_definitions`. No row migration this phase.
