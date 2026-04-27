## Combine selected items into a single line item

Add a "Combine into one item" affordance on the **Review** step of both the CO Wizard (`COWizard.tsx`) and the Add-Item mini-wizard (`AddScopeItemButton.tsx`). When two or more items are selected, the user can merge them into a single `co_line_items` row that carries one combined name, one AI description, and a list of the original items as sub-bullets in its description.

### UX

In `StepReview` (which both flows share):

- When `data.selectedItems.length >= 2`, show a small **"Combine into one item"** button at the top of the "Per-item descriptions" section, next to "Regenerate all".
- Clicking it opens an inline confirm strip:
  - Editable **Combined name** input (default: `"<First item> + N more"`, e.g. `"Opening modification + 2 more"`).
  - Preview list of items being combined (read-only chips).
  - **Combine** / **Cancel** buttons.
- After combine: the selected-items list collapses to **one** synthetic item; AI re-generates a single description that mentions all the original sub-items (one paragraph) plus an indented bullet list of original names. The user can still edit the description and the combined name.
- An **"Uncombine"** link appears on the merged item so the action is reversible during the wizard (we keep the originals in local state under `data.combinedSource`).

### Data model (no DB migration)

We store the combined item as a single `co_line_items` row, reusing existing columns:

- `item_name` = combined name (e.g. `"Opening modification + Damaged material removal + Header installation"` truncated, or user-edited).
- `description` = AI-drafted paragraph + newline-separated `• <orig name> (qty unit)` lines.
- `qty` / `unit` = `null` (mixed units) — UI shows "—" and hides the qty input for combined rows.
- `catalog_item_id` = the **first** source item's catalog id (so FK still resolves) — acceptable because the row is treated as a custom composite line; the description is the source of truth.
- `category_name` = `"Combined scope"` (constant) so it's visually distinct.
- `quantity_source` = `'manual'`.

We add a transient field on `SelectedScopeItem` used **only in wizard state** (not persisted): `isCombined?: boolean` and `combinedFrom?: { name: string; qty: number|null; unit: string|null }[]`. Persistence still goes through the existing `handleSaveItems` / Add-Item insert path — no schema change needed.

### AI description

Extend `generate-work-order-description` (`per_item` mode) to accept a `combined: true` flag with `sub_items: [...]`. When set, returns one description (1-3 sentences per the AI scope description rule) that names the location and reason and references the bundled work, followed by a `• ...` list of the originals. Local fallback in both wizards builds the same shape so offline still works.

### Files touched

- `src/components/change-orders/wizard/COWizard.tsx`
  - Extend `SelectedScopeItem` (in-memory only) with `isCombined?` and `combinedFrom?`.
  - In `StepReview`: add Combine button, inline combine panel, Uncombine link, and qty-input suppression for combined rows.
  - Update local-fallback description builder to handle the combined case.
- `src/components/change-orders/AddScopeItemButton.tsx`
  - Mirror the local-fallback combined description builder.
  - `handleSaveItems` already inserts whatever is in `data.selectedItems` — no change needed beyond letting one combined row through.
- `supabase/functions/generate-work-order-description/index.ts`
  - Accept and honor `combined` + `sub_items` in `per_item` mode; return a single `items: [{ id, description }]` entry shaped the same as today.

### Edge cases

- Combining is disabled (button hidden) when fewer than 2 items are selected.
- Removing items inside a combined row isn't supported — user must Uncombine first.
- If user goes Back to Scope step and changes selections, any existing combined item is auto-uncombined and originals are restored.
- Reason and location_tag for the combined row use the wizard-level values (consistent with the per-item model — combining implies the same why/where applies).
