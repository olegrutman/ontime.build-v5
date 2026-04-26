# Improve CO/WO scope: add-more-items + precise multi-item AI description

## Problem (from screenshot)

On the Review step of a CO/WO with 2 items ("Siding prep", "Sheathing replacement"), the AI wrote:
> "The scope of work for the Fuller Residence involves siding prep and sheathing replacement at the front exterior trim. These tasks are being performed due to a design change."

Two issues:
1. **No way to add more items from Review** — user has to click Back to Step 3.
2. **Description is generic** — doesn't enumerate quantities, doesn't group by component, doesn't leverage project context (home type, framing method, level), and gets vaguer as items grow.

## What we'll change

### 1. "Add more items" inline on Review step (`COWizard.tsx` → `StepReview`)

- Add an **`+ Add more items`** button at the bottom of the Scope items list.
- Clicking opens an inline `Dialog` containing the existing `StepCatalog` component, scoped to the same `locationTag` and `reason`.
- New picks merge into `data.selectedItems` (dedup by id).
- After closing, auto-trigger `generateAIDescription()` so the description refreshes with the new full set.

### 2. Better multi-item AI generation (`generate-work-order-description/index.ts`)

Pass richer context and tighten the prompt:

**New payload fields sent from `COWizard.tsx`:**
- `project_name` (already sent — keep "Fuller Residence")
- `home_type`, `framing_method`, `floors`, `total_sqft` from `project_scope_details` (fetched once on wizard mount, cached)
- `selected_items` upgraded from `string[]` → `Array<{ name, qty, unit, category }>` so the model sees quantities and trade groupings
- `location_tag` (already sent, now ordered Component-first per the recent reorder)

**Prompt rewrite:**
```
You are a construction scope writer for {project_name}.
Write 2-4 sentences. Required content, in order:
1. Name the project once ("the {project_name}") and the location.
2. List EVERY scope item by name. If 4+ items, group them by category
   (e.g. "framing tasks include X, Y, Z; sheathing work includes A, B").
3. Mention quantities/units when provided (e.g. "120 SF of sheathing").
4. State the reason in plain language.
Do NOT invent items, materials, sizes, or methods not in the input.
Do NOT recommend, schedule, or price.
```
- Increase `max_tokens` 200 → 400 for larger item sets.
- Lower `temperature` 0.3 → 0.2 for tighter, less floral output.

### 3. Auto-regenerate when item set changes on Review

Currently description only generates once on entering Review. Add a `useEffect` keyed on `data.selectedItems.length` (and a `descriptionDirty` flag) so adding/removing items re-drafts automatically (with 500 ms debounce so manual edits are preserved unless items actually changed).

## Files touched

- `src/components/change-orders/wizard/COWizard.tsx` — Review step add-more dialog, fetch project scope context, debounced regenerate, payload upgrade.
- `supabase/functions/generate-work-order-description/index.ts` — accept richer item objects + project context, rewrite prompt, bump tokens.
- `src/components/change-orders/wizard/StepCatalog.tsx` — small prop addition (`hideHeader`) so it embeds cleanly in the Review dialog.

## Out of scope

- No DB migrations.
- No changes to `AddScopeItemButton` (post-creation flow on the CO detail page) — that already works.
- No changes to Step 3 itself.

## Acceptance test

1. Create a CO with 2 items at "Exterior · Trim · Front" with reason "Design change" — description names both items and the project once.
2. On Review, click **+ Add more items**, pick 4 more items across two categories — description regenerates, lists all 6 grouped by category, includes any qty/unit values, mentions Fuller Residence by name once.
3. Edit description manually then add another item — toast asks "Replace edited description?" before regenerating (preserve user edits).
