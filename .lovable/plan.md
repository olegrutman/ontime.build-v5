

## Plan — Adopt the Smart Picker (search-first PO product picker)

You uploaded three drop-in pieces that, together, replace the current `ProductPicker` with a faster, search-first version. Here's what I learned and how I'll wire it up.

### What the three files do

**1. `SmartPicker.tsx`** — the new picker shell
- Same public contract as the existing `ProductPickerContent` (`onAddItem`, `onUpdateItem`, `onLoadPack`, `onAddPSMItem`, `onClearEdit`, `onClose`, `onExitPicker`, `editingItem`, `hidePricing`, `hasApprovedEstimate`, `projectId`, `supplierId`) so it can be swapped in with zero changes to the parents.
- Adds a **persistent search bar** at the top of every screen (except quantity) backed by the new `search_catalog_v3` RPC. Typing 2+ chars takes over the body with results, regardless of which step you're on. Clearing search returns you where you were.
- New **landing screen** with three zones: "From Estimate" shortcut (only if `hasApprovedEstimate`), a **Recently Ordered** strip (last 90 days, last 12 SKUs from `recent_catalog_items` RPC), and the **category grid** sorted by item count from `catalog_facets`.
- **Exact-SKU short-circuit:** if the user types a SKU and the top result has score ≥ 1000 (exact match), it skips straight to the QuantityPanel.
- **Category-aware routing** via `categoryFunnels.ts` — three patterns:
  - `structured` → straight into `StepByStepFilter` with a fixed field sequence (e.g. FramingLumber → dimension → length → wood_species)
  - `hybrid` → `SecondaryCategoryList` first, then `StepByStepFilter`
  - `search` → skip funnel, dump terminal `ProductList` and let search drive (Hardware, Framing Accessories, Structural)
- Reuses existing primitives: `EstimateSubTabs`, `SecondaryCategoryList`, `StepByStepFilter`, `ProductList`, `QuantityPanel`.

**2. `categoryFunnels.ts`** — declarative routing config
- Maps each of the 10 DB categories (FramingLumber, FinishLumber, Decking, Sheathing, Exterior, Engineered, Drywall, Hardware, FramingAccessories, Structural) to `{displayName, icon, pattern, funnelFields[]}`.
- Replaces the runtime field-discovery logic in today's `StepByStepFilter` (which scans every catalog row in JS) with hand-tuned per-category funnels based on measured fill rates. Faster and never lands on empty screens.
- Exports `FIELD_LABELS` and `initialStepFor()` helpers.

**3. `20260423_picker_cleanup.sql`** — the database backbone
- Cleans up `secondary_category` whitespace and folds dupes (`'T&G '` → `'T&G'`, `'SOFFITS'` → `'SOFFIT'`, etc.) and uppercases `manufacturer`.
- Adds `pg_trgm` extension + a trigger-maintained `normalized_search` column that collapses `"2 in. x 4 in."` → `"2x4"` and `"12 ft."` → `"12ft"` so a user typing "2x4x8" matches catalog rows.
- Adds three indexes: trigram GIN on `normalized_search`, composite `(supplier_id, category, secondary_category)` for funnel queries, and `UPPER(supplier_sku)` for SKU lookups.
- Ships three RPCs:
  - `catalog_facets(supplier_id)` — single round-trip category + secondary counts (replaces the N+1 client tally)
  - `search_catalog_v3(query, supplier_id, category, secondary, limit)` — blended SKU-exact (1000) + SKU-prefix (500) + FTS (0–100) + trigram (0–50) scoring with graceful typo fallback
  - `recent_catalog_items(supplier_id, project_id, days, limit)` — drives the "Recently Ordered" strip from `po_line_items` history

### How I'll implement it

**Step A — Run the SQL migration**
- Apply `20260423_picker_cleanup.sql` as a database migration. This is non-destructive: cleanups are idempotent (`IS DISTINCT FROM` guards), the column is `IF NOT EXISTS`, the trigger is `DROP IF EXISTS`/`CREATE`, and the existing `search_catalog_v2` RPC is left in place so nothing currently using it breaks.

**Step B — Add the new files**
- Create `src/lib/categoryFunnels.ts` (uploaded content, unchanged).
- Create `src/components/po-wizard-v2/SmartPicker.tsx` (uploaded content, unchanged).

**Step C — Tiny prop addition to `StepByStepFilter`**
- The uploaded SmartPicker passes a commented-out `fixedSequence={funnelFields}` prop. To honor the per-category funnels (instead of the slow client-side discovery), I'll add an optional `fixedSequence?: string[]` prop to `StepByStepFilter`. When provided, it skips `discoverFilterSequence()` and uses the supplied array directly. When omitted, behavior is unchanged — preserving today's callers.
- Then uncomment the `fixedSequence={funnelFields}` line in SmartPicker.

**Step D — Swap-in at the two call sites**
Both parents already use the same prop shape, so the swap is one import + one tag change each:
- `src/components/po-wizard-v2/POWizardV2.tsx` (line 19, 501) — replace `ProductPickerContent` with `SmartPicker` (alias the ref type to `SmartPickerHandle`).
- `src/components/change-orders/COMaterialsPanel.tsx` (line 26, 1071) — same swap.
- The old `ProductPicker.tsx` file stays in the repo for one release as a fallback, then gets deleted.

**Step E — Verify in the preview**
- Type `2x4x8` — should match framing lumber even though the catalog stores `"2 in. x 4 in."` + `"8 ft."`.
- Type a known SKU — should jump straight to QuantityPanel.
- Open a fresh PO with no recent history — recent strip is hidden, category grid renders sorted by count.
- Open a PO after creating a few line items — recent strip shows last picks, single tap = QuantityPanel.
- Confirm the "From Estimate" tab still works on projects that have an approved estimate.

### Files changed

| Action | File |
|---|---|
| New | `supabase/migrations/<ts>_picker_cleanup.sql` (the uploaded SQL) |
| New | `src/lib/categoryFunnels.ts` |
| New | `src/components/po-wizard-v2/SmartPicker.tsx` |
| Edit | `src/components/po-wizard-v2/StepByStepFilter.tsx` (add optional `fixedSequence` prop) |
| Edit | `src/components/po-wizard-v2/POWizardV2.tsx` (swap import + JSX) |
| Edit | `src/components/change-orders/COMaterialsPanel.tsx` (swap import + JSX) |
| Keep | `src/components/po-wizard-v2/ProductPicker.tsx` (left in place this release as fallback) |

### What you get
- One search bar, available everywhere, that handles SKUs, dimensions, and typos.
- Recently-ordered strip — for crews whose next PO is mostly a repeat of their last, this is the biggest UX win.
- Funnels tuned per category, no more empty filter screens for sparse fields.
- One DB round-trip for category counts instead of pulling rows and tallying client-side.

