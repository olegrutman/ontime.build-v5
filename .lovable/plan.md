
# CO Picker v3 — Scope Step Improvements

Three issues to fix on the Scope step (Step 2 of 4):

## 1. Add Full Catalog Browser to Scope Step

**Problem:** Work types are hardcoded per system (WORK_BY_SYSTEM in StepScopeCombined.tsx). Users can only pick from a small curated list, not the full `catalog_definitions` table.

**Solution:** Replace the hardcoded work type pills with a catalog browser that uses `useScopeCatalog()` — the same hook that already exists and powers the CO scope picker logic. The flow:

- Show AI-suggested items first (from `filterByContext` using the current item's zone/reason/system).
- Below suggestions, add a "Browse Full Catalog" button/section that opens a drill-down by division > category > items (same structure PO wizard uses with `CategoryGrid` > `SecondaryCategoryList` > item list).
- Add a search bar at the top for quick text search (uses `useScopeCatalog().search()`).
- Selected items get added as work types in the picker state.

Files changed:
- `src/components/change-orders/picker-v3/StepScopeCombined.tsx` — replace hardcoded WORK_BY_SYSTEM with catalog-driven UI
- Potentially extract a `ScopeCatalogBrowser` sub-component for cleanliness

## 2. Hide Markup % from GC View in Aside

**Problem:** The right-side panel (PickerAside) shows "18% markup" in the total panel. Per spec, GCs should not see TC/FC markup details.

**Solution:** In `PickerAside.tsx`, conditionally hide the markup row and the "· 18% markup" text in the summary line when `state.role === 'GC'`. GCs see a clean total without margin breakdown.

Files changed:
- `src/components/change-orders/picker-v3/PickerAside.tsx` — conditionally render markup row based on role

## 3. More Descriptive Item Cards in Aside

**Problem:** The item cards on the right show minimal info — just location, cause name, and counts like "3 work types · 0 materials".

**Solution:** Replace the generic counts with:
- The actual work type names (comma-separated, truncated if long)
- The pricing type label (Fixed / T&M / Unit)
- The system name more prominently

Files changed:
- `src/components/change-orders/picker-v3/PickerAside.tsx` — enrich item card content

---

### Technical Notes

- `useScopeCatalog()` already provides `divisions`, `search()`, and `filterByContext()` — no new data fetching needed.
- The zone can be resolved from the item's `locations` + `system` using existing `resolveZone()` utility.
- Catalog items selected from the browser will map to work types in the picker state (id = catalog slug, label = canonical_name).
