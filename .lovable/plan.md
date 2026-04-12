

# Smart Scope Filtering Based on Work Type

## The Problem (Plain English)

When you create a new Work Order, step 1 asks "What type of work?" (e.g., Framing, Demolition, Exterior). But when you get to step 2 (Scope), the catalog shows **everything** — all divisions, all categories, all items. If you picked "Framing", you still see Roofing, Exterior Skin, Windows, etc. That's confusing and wastes time.

## How It Should Work

When you pick a work type like **Framing**, the scope catalog should:

1. **Auto-navigate** into the matching division (e.g., jump straight into the "Framing" division) instead of showing the top-level grid of all divisions
2. **Still let you browse other divisions** if you want — but show a clear "Showing items for: Framing" header with a link to "Browse all trades" if needed
3. **Pre-filter search results** to prioritize items from the matching division (show them first, then "Other trades" results below a separator)

For work types that don't map 1:1 to a catalog division (like "Backout" or "Other"), just show the full catalog like today.

## The Mapping

| Work Type (Step 1) | Auto-opens Division |
|---|---|
| Framing | `framing` |
| Reframing | `framing` |
| Sheathing | `framing` (sheathing category) |
| Blocking | `framing` (blocking category) |
| Exterior | `exterior` |
| Stairs | `framing` |
| Demolition | Show all (no direct match) |
| Backout | Show all (no direct match) |
| Other | Show all |

## Technical Changes

### 1. `StepCatalog.tsx` — Accept optional `workType` prop

- Add `workType?: string` to `StepCatalogProps`
- On mount, if `workType` maps to a known division, auto-set `level='category'` and `activeDivision` to that division (skip the top-level grid)
- Add a small banner at the top: "Showing scope for **Framing**" with a "Browse all trades →" link that resets to `level='division'`
- For search: sort results so items matching the active division appear first, with a visual separator before "Other trades" results

### 2. `TMWOWizard.tsx` — Pass `workType` to `StepCatalog`

- Pass the selected `data.workType` through the `catalogData` adapter or as a separate prop to `StepCatalog`
- The existing `COWizard` and `AddScopeItemButton` don't pass `workType`, so they get the current behavior (full catalog) — no breaking changes

### 3. `useScopeCatalog.ts` — No changes needed

The hook already returns all divisions structured. The filtering is purely a UI concern in `StepCatalog`.

## Result

Picking "Framing" → scope step opens directly to the Framing division's categories. You see only framing-related items immediately. One click to browse everything else if needed. Search still works across everything but shows relevant items first.

