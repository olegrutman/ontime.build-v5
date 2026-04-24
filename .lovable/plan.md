
# Phase 3 + 4 — Wire QA Mode + AI Quantities & Refinement

Phase 1 (catalog) and Phase 2 (Q&A flows + AI matcher edge function) are built but the QA component is **never rendered** — Step 3 still uses the old 3-tier picker only. Phase 3 hooks the QA flow into the wizard. Phase 4 layers AI quantity auto-fill, an evidence table, and a location-refinement banner on top.

---

## PHASE 3 — Wire QA Mode Into the Wizard

### What changes for the user

When a user reaches Step 3 (Scope) of the CO or T&M WO wizard, after location + reason are set they see a mode toggle at the top:

```text
┌─ How do you want to pick scope? ────────────────────────┐
│  ✦ Ask Sasha            ⌨ Browse catalog                │
│  (recommended — 4 questions)   (manual 3-tier picker)   │
└─────────────────────────────────────────────────────────┘
```

- **Ask Sasha** (default for first-time users) → renders `<StepCatalogQA>` — runs the building-type-aware question tree, then calls `suggest-scope-items` and lets the user multi-select AI picks.
- **Browse catalog** → renders today's `<StepCatalog>` 3-tier picker.
- A "Type instead" escape inside QA falls back to a textarea that pipes the typed description directly into `suggest-scope-items` (no questions).
- The user's last-used mode is remembered per project in `localStorage` (`co_wizard_scope_mode_<projectId>`).

When QA completes (`onComplete`), the picked items + AI description + structured answers are merged back into `COWizardData` and the wizard advances normally to Step 4.

### Files

**New**
- `src/components/change-orders/wizard/StepCatalogModeSwitch.tsx` — small two-button segmented control + persistence.
- `src/components/change-orders/wizard/StepCatalogTypeFallback.tsx` — textarea + "Match" button that calls `useScopeSuggestions` directly (skips Q&A).

**Edited**
- `src/components/change-orders/wizard/StepCatalog.tsx` — at the top of the `items` phase, render the mode switch. When `mode === 'qa'`, mount `<StepCatalogQA>` instead of the existing 3-tier picker. Hook `onComplete` to write `selectedItems`, `aiDescription`, and structured `answers` back via the existing `onChange` prop.
- `src/components/change-orders/wizard/COWizard.tsx` — extend `COWizardData` with `qaAnswers?: Record<string, string | string[]>` so the structured answers persist for the AI description regenerator and the future suggest endpoint context. Also delete the dead `SMART_SUGGESTIONS` auto-populate block (lines 215–240) — it relies on retired hardcoded data.
- `src/components/change-orders/wizard/TMWOWizard.tsx` — same mode switch + same `qaAnswers` field. Mirror the COWizard edits.

### Glue rules

- The QA `onComplete.selectedItems` already returns `SelectedScopeItem[]` shaped like the manual picker, so no schema work is needed in Phase 3.
- If QA returns 0 picks, auto-flip to `mode='browse'` and toast "No automatic matches — pick manually" so the user is never stuck.
- `aiDescription` from QA replaces whatever was previously in the field; the existing Step 5 review screen continues to render it as-is.

---

## PHASE 4 — AI Quantities + Evidence Table + Refinement Banner

Three independent additions, all behind the QA flow:

### 4a · AI quantity auto-fill on line items

The `suggest-scope-items` edge function already returns `suggested_quantity` and `quantity_source` per pick. Today those fields are displayed as a chip but **never persisted**. Phase 4 persists them.

- **Migration**: add three columns to `co_line_items`:
  - `quantity_source text` — `'ai' | 'manual' | 'photo'` (nullable; legacy rows stay NULL)
  - `ai_confidence numeric` — 0..1 (nullable)
  - `ai_reasoning text` — short sentence for audit trail
  
  No CHECK constraint on `quantity_source` (use a validation trigger only if a bad value appears in the wild — keeps migrations restorable).
- **`SelectedScopeItem`** gains optional `qty?: number | null`, `quantity_source?`, `ai_confidence?`, `ai_reasoning?`. The `StepCatalogQA.handleConfirm` mapper copies them from the chosen `SuggestPick`.
- **CO/WO insert** (COWizard line 324–337 + TMWOWizard equivalent) writes these fields into `co_line_items` so they show up everywhere line items render.
- **Pick card UX** in `StepCatalogQA`: the AI quantity chip becomes editable inline. Tap it → small popover with a number input + unit. Edit drops `quantity_source` to `'manual'`, hides the AI confidence ring, and clears `ai_reasoning`. This enforces the "AI never auto-confirms" rule.

### 4b · `co_scope_evidence` table (photos/captions deferred, schema ready)

Per your decision, no photo upload UI ships in this phase, but the table goes in now so future vision work doesn't require a second migration.

```text
co_scope_evidence
├── id uuid PK
├── co_line_item_id uuid → co_line_items(id) ON DELETE CASCADE
├── kind text  ('photo' | 'caption' | 'qa_answer')
├── photo_path text                      (storage object path; nullable)
├── caption text                         (vision output or QA summary)
├── ai_model text                        (e.g. 'google/gemini-2.5-flash')
├── confidence numeric                   (0..1)
├── created_by uuid
├── created_at timestamptz default now()

RLS: SELECT/INSERT/DELETE inherit from the parent CO via can_access_change_order(co_id),
joined through co_line_items. Mirror the existing co_line_items policies.
```

When QA finishes, write one `kind='qa_answer'` row per line item with `caption = flow.summarize(ctx, answers)` so we have an audit trail of why each item was suggested. No bucket created in this phase.

### 4c · Location-refinement banner

The matcher edge function already returns `extracted.zone_refinement` (e.g. user described "rim joists" but selected "Floor system"). Today it's ignored.

Add a small banner above the picks list inside `StepCatalogQA`:

```text
┌─ ⓘ Location refinement ─────────────────────────────────┐
│ Sasha thinks this is closer to "Rim joist / band joist" │
│ than "Floor system". Update location?                   │
│                            [ Keep current ] [ Update ↻ ]│
└─────────────────────────────────────────────────────────┘
```

- "Update" calls back into the wizard via a new `onLocationRefine(newTag: string)` prop, which patches `data.locationTag` and re-runs `useScopeSuggestions` once with the new context.
- Banner only shows when `extracted.zone_refinement` is non-null and differs from the current `locationTag`.
- Refinement is **opt-in** — never auto-applied.

### Files (Phase 4)

**New**
- `supabase/migrations/<ts>_co_line_items_ai_columns.sql` — three columns above.
- `supabase/migrations/<ts>_co_scope_evidence.sql` — table + RLS.
- `src/components/change-orders/wizard/QuantityEditPopover.tsx` — number input on the pick card.
- `src/components/change-orders/wizard/LocationRefinementBanner.tsx`.

**Edited**
- `src/components/change-orders/wizard/COWizard.tsx`, `TMWOWizard.tsx` — extend `SelectedScopeItem`, persist new fields on insert, write `co_scope_evidence` rows.
- `src/components/change-orders/wizard/StepCatalogQA.tsx` — wire popover, banner, and pass `onLocationRefine` up.
- `src/components/change-orders/wizard/StepCatalog.tsx` — pass `onLocationRefine` through to QA.
- `src/types/changeOrder.ts` — add the three optional fields to `ScopeCatalogItem`/`SelectedScopeItem`.

---

## Acceptance

**Phase 3**
1. Step 3 of both COWizard and TMWOWizard shows a mode switch; default = "Ask Sasha" for first project use, then sticky per-project.
2. Completing the QA flow inserts the picked items into the CO with the AI-generated description.
3. "Type instead" lets the user write free text, hit Match, and pick from results — no questions asked.
4. "Browse catalog" still works exactly as today (3-tier picker untouched).
5. The dead `SMART_SUGGESTIONS` auto-populate block is removed.

**Phase 4**
6. New `co_line_items` columns exist; AI-picked items insert with `quantity_source='ai'`, `ai_confidence`, `ai_reasoning` populated; manually edited quantities flip the source to `'manual'`.
7. `co_scope_evidence` table exists with RLS; one `qa_answer` row is written per line item created via QA.
8. When the matcher returns a `zone_refinement`, the banner appears; tapping "Update" re-runs the match against the new location; tapping "Keep" dismisses it.
9. Existing CO/WO records (with no `quantity_source`) continue to render and edit without errors.

---

## Out of scope (intentionally deferred)

- Photo upload + vision captioning (per your answer, we ship the schema but not the UI).
- Per-org catalog admin UI.
- Migrating the 256 legacy `work_order_catalog` rows.
- Streaming the AI matcher response (current call is non-streaming via `supabase.functions.invoke`).
