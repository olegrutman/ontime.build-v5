

# Add Per-Item Location & Auto-Number COs

## Two changes requested

### 1. CO title = auto-generated number + date (not a description)

Currently the wizard sets `title` from the first item name or a manual field. Instead:
- Auto-generate title as `"CO-{sequential_number} · {MMM DD, YYYY}"` (e.g. `CO-003 · Mar 20, 2026`)
- Sequential number = count of existing COs on this project + 1 (query at creation time)
- Remove the manual title input from the wizard
- Also populate `co_number` column with the sequential number string (e.g. `CO-003`)
- Display this in list and detail pages as the CO identifier

**Files**: `COWizard.tsx` (remove title from data, auto-generate at submit), `COWizardData` type (remove `title` field), `StepReview.tsx` (show auto-number preview), `COListPage.tsx` and `CODetailPage.tsx` (display `co_number` prominently instead of title)

### 2. Each scope item gets its own location (mini-wizard for adding items)

Currently `location_tag` lives on the CO header. Each line item should have its own location instead.

**Database migration**: Add `location_tag TEXT` column to `co_line_items`.

**New "Add Scope Item" flow** — replace the current simple catalog dialog with a 2-step mini-wizard:
1. **Step 1 — Pick item** from catalog (same catalog browser: search + drill Division → Category → Item)
2. **Step 2 — Pick location** for that item (reuse the same location picker from `StepLocation.tsx`, but for a single location, not multi-select)
3. Insert into `co_line_items` with the `location_tag` value

**CO creation wizard** — same change: in the Scope step, each selected item gets a location. The flow becomes: pick item → pick location → item added to list. Repeat. Location step (step 3) becomes optional or removed since location is per-item now.

**Display**: In `COLineItemRow`, show a small `MapPin` badge with the location tag for each line item. In the CO header, remove or keep `location_tag` as a summary (join unique item locations).

### Files to change

| File | Change |
|------|--------|
| **Migration** | Add `location_tag TEXT` to `co_line_items` |
| `changeOrder.ts` | Add `location_tag` to `COLineItem` interface; remove `title` from `COWizardData` |
| `COWizard.tsx` | Remove manual title; auto-generate `co_number` + title at submit; update Scope step to collect location per item; consider removing the standalone Location step |
| `StepCatalog.tsx` | Refactor to support per-item location: after selecting a catalog item, show location picker before confirming |
| `StepReview.tsx` | Show auto-generated CO number; show each item with its location |
| `CODetailPage.tsx` | Replace `AddScopeItemButton` with mini-wizard (catalog pick → location pick); display `co_number` as heading; show per-item location in line item rows |
| `COLineItemRow.tsx` | Show `location_tag` badge per item |
| `COListPage.tsx` | Display `co_number` as the primary identifier instead of title |

### Wizard step order after change
1. **Reason** — cause of change
2. **Configuration** — pricing, assignment
3. **Scope** — pick items, each with its own location (catalog browse → location picker per item)
4. **Review** — summary with auto-generated CO number

Location step is removed as a standalone step since location is now per-item in the Scope step.

