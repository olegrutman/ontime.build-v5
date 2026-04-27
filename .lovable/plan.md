
## Goal

When a user clicks **+ Add item** on an existing CO/WO, run them through the **same Why → Where → Scope → Review** flow that produced the first batch of items — not just a bare catalog picker. Each newly added item carries its own intent, location, reason, QA-grounded description, and per-item editable description, exactly like the originals.

## Today vs. after

Today (`AddScopeItemButton.tsx`):
```text
[+ Add item] → modal → StepCatalog (bare picker) → save line items
                       ⛔ no Why, no Where, no QA, no per-item description
```

After:
```text
[+ Add item] → modal → Why → Where → Scope (catalog + QA) → Review (per-item descriptions) → save line items
```

We deliberately **skip** the original wizard's "How" step (pricing, NTE, FC/material toggles) and the "Create CO" submit. Those are CO-level decisions already locked in when the CO was created. Add-item only contributes scope rows.

## What to build

Refactor `AddScopeItemButton` from a single-step dialog into a **mini-wizard reusing the exact same step components** as `COWizard`:

1. Extract the step renderer + footer from `COWizard.tsx` into something the add-item modal can share. Cleanest: keep `COWizard` as-is, but **import** the same step component imports it already uses (`StepWhy`, `StepWhere`, `StepCatalog`, `StepReview`) into `AddScopeItemButton` and drive a local 4-step state machine there. No duplication of the step UIs themselves.

2. Step list inside Add Item modal:
   - **Why** — `<StepWhy data={wizardData} onChange={update} isTM={isTM} />` (sets `intent`, `reason`, optional trigger)
   - **Where** — `<StepWhere ... />` (sets `locationTag`)
   - **Scope** — `<StepCatalog ... intent={data.intent} />` (drives QA → catalog selection, populates `selectedItems` with their per-item `locationTag`/`reason`/`reasonDescription`)
   - **Review** — `<StepReview .../>` but in **"add-mode"**: hide the CO-name input, hide pricing summary, hide "Create CO" copy. Only show the per-item description editor list and a "Add N items" submit. (Add a small `mode?: 'create' | 'add'` prop to `StepReview` that gates the non-applicable sections.)

3. Reuse the same per-item AI description generation (the `generate-work-order-description` edge function with `mode: 'per_item'`) on entry to the Review step, identical to `COWizard`'s flow.

4. On submit, keep the existing `co_line_items` insert logic in `AddScopeItemButton.handleSaveItems`, but additionally persist the per-item `description` from `wizardData.itemDescriptions[item.id]` (today it uses `item.reasonDescription`; switch to the edited Review-step description when present, falling back to `reasonDescription`).

5. Source the modal's initial `intent`/`reason`/`locationTag` from the parent CO (`co.reason`, `co.location_tag`) as **suggested defaults** the user can change — if their added item is in a different room or for a different reason, they're free to pick again. This matches your point that "additional items could be unrelated to the original why."

6. Reuse the same Dialog/Sheet shell and stepper UI pattern as `COWizard` (top progress dots + step nav, footer with Back/Next/Submit). Mobile uses `Sheet`; desktop uses `Dialog`. Reuse `WORK_INTENT_LABELS`/`CO_REASON_LABELS` chips in the header for consistency.

## Files to touch

- `src/components/change-orders/AddScopeItemButton.tsx` — convert from one-step `StepCatalog` modal into a 4-step mini-wizard reusing `StepWhy`/`StepWhere`/`StepCatalog`/`StepReview`. Add the per-item AI description trigger on entering Review. Update `handleSaveItems` to write the Review-edited `itemDescriptions` into `co_line_items.description`.
- `src/components/change-orders/wizard/COWizard.tsx` — export `StepWhy`, `StepWhere`, `StepReview` (currently they're inner components in this file based on `function StepReview` at line 1070). Make them named exports so `AddScopeItemButton` can import them. No behavioral change.
- `src/components/change-orders/wizard/StepReview.tsx` *(or wherever it lives after extraction)* — add an optional `mode: 'create' | 'add'` prop that hides CO-name input, pricing summary, and the FC/material configuration recap when `mode === 'add'`.

## Out of scope

- The original full COWizard for new COs is unchanged.
- No DB schema changes — `co_line_items` already has `reason`, `location_tag`, and `description` per row.
- No changes to the "How" step (pricing/NTE/responsibilities) — that's a CO-level configuration, not per added item.

## Open question (will default if not answered)

Should the **Why** and **Where** steps in Add-Item be **prefilled from the parent CO's `co.reason` / `co.location_tag`** so power users can hit Next twice and jump to Scope? Default: **yes, prefill but fully editable** — matches the new per-item model where additional items often share context but don't have to.
