
## Problem

The "Suggested" items on the Scope step show unrelated items together (e.g., "Electrical Conflict" corrections alongside "T&G wood wall paneling — install" finishes). This happens because of three filter gaps:

1. **`workType` is always `null`** in the filter context passed to `filterByContext()`. The `ScopeCatalogBrowser` never reads `cur.system` (the selected system like "Framing", "Electrical", etc.) to narrow results. Since `!null === true`, the workType check always passes — every item's `applicable_work_types` is ignored.

2. **`applicable_zone: 'any'` is too permissive** — Corrections items (Code correction, MEP backout, etc.) have `zone: 'any'`, so they always land in "primary" as long as reason matches. They should only be primary when reason strongly matches.

3. **No scoring/ranking** — All "primary" items are treated equally. A relevance score would push strongly-matching items to the top and weakly-matching items lower.

## Plan

### 1. Wire `system` into the filter context

In `ScopeCatalogBrowser.tsx`, map `cur.system` (e.g., `"electrical"`, `"framing"`) to the `workType` field of `FilterContext`. This immediately eliminates items whose `applicable_work_types` don't include the selected system.

- If user selected system = "Electrical" and reason = "conflict", only items with `applicable_work_types` containing `"electrical"` (or empty = wildcard) AND `applicable_reasons` containing the resolved reason will be primary.
- T&G paneling has `applicable_work_types: [remodel, new_construction, repair]` — it won't match "electrical" and drops to secondary/hidden.

### 2. Downgrade `zone: 'any'` items to secondary when reason doesn't match

Tighten the scoring in `filterByContext()`:
- Items with `applicable_zone: 'any'` that match on reason + workType → primary
- Items with `applicable_zone: 'any'` that fail reason OR workType → secondary (not primary)

This prevents generic "catch-all" corrections from polluting the suggestions when the user is doing an owner-requested interior finish.

### 3. Add a simple relevance score to sort primary items

Within the primary bucket, score items by how many dimensions match:
- +2 for exact zone match (not wildcard)
- +1 for reason match
- +1 for workType match

Sort primary descending by score. This pushes the most relevant items to the top of the grid.

### Files changed

| File | Change |
|------|--------|
| `src/components/change-orders/picker-v3/ScopeCatalogBrowser.tsx` | Pass `cur.system` as `workType` in `FilterContext` |
| `src/hooks/useScopeCatalog.ts` | Update `filterByContext` to downgrade zone-wildcard items and add scoring |

### What this does NOT change

- The full catalog browse remains unaffected (no filtering there)
- Search results remain unfiltered
- No database changes needed — the `applicable_*` columns already have the right data
