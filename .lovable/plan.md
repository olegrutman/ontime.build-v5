# CO System v4 — Implementation Plan

## Guiding principles
- **Strictly additive.** Picker-v3 (`/project/:id/change-orders/new`), `CODetailLayout`, pricing, status, and `apply_co_contract_delta` stay untouched. New flows ship behind a feature flag (`co_v4`) on new routes.
- **Reuse the existing data spine.** `change_orders`, `co_line_items`, `co_labor_entries`, `co_material_items`, `co_equipment_items`, `co_collaborators`, and `useChangeOrderDetail` already implement the "CO = mini-project" model. v4 adds *entry points*, *AI*, *visibility hardening*, and *rollup*, not a parallel schema.
- **Visibility wall enforced in the database**, not the client. Today `useCORoleContext` hides cost/markup in React only — that's the leak risk in the current screenshot bug class.

---

## Phase 0 — Foundations (no user-visible change)

**Goal:** unlock v4 without touching live flows.

- Add `feature_flags.co_v4` (org-scoped, default off; platform admins on first).
- Add `change_orders.entry_source enum('picker_v3','ai_intake','guided_v4','field_pn')` defaulting to `'picker_v3'`. Backfill existing rows.
- Add `change_orders.problem_summary text`, `problem_voice_url text`, `ai_intake_id uuid null` (FK to a new `co_ai_intakes` table created in Phase 2).
- Add `co_line_items.source enum('manual','picker_v3','ai_split','guided_v4','scenario_library')` default `'manual'`, plus `co_line_items.scenario_id text null` and `group_key text null` (for multi-unit grouping).

All columns nullable / defaulted — zero-impact for existing reads.

---

## Phase 1 — Visibility wall at the data layer (column-level views + revoke)

**Goal:** make it physically impossible for a GC client to read TC cost/markup, or an FC client to read price/margin, regardless of UI bugs.

**Strategy:** keep base tables; add three role-scoped views per pricing table; revoke direct SELECT from `authenticated`; rewrite client reads to hit views.

Tables in scope: `co_line_items`, `co_labor_entries`, `co_material_items`, `co_equipment_items`, `co_nte_log`, and the derived financials path.

For each table T, create:
- `T_gc_view` — strips `unit_cost`, `*_cost`, `markup_percent`, `markup_amount`, `tc_snapshot_*`, internal notes. Exposes the **billable** price columns + responsibility flags.
- `T_tc_view` — full row for the TC org that owns the CO (plus any TC collaborators), but strips the GC's budget context if present.
- `T_fc_view` — only own-org rows; strips price, markup, and TC labor rate; keeps `hours`, FC `hourly_rate` (own org), `description`.

Each view uses `WITH (security_invoker=on)` and is gated by helper functions:
- `public.co_viewer_role(co_id uuid) returns text` — resolves GC/TC/FC for `auth.uid()` against `project_participants` + `co_collaborators`.
- `public.can_see_co(co_id uuid) returns boolean` — wraps `is_project_participant` + collaborator membership.

Then:
```sql
REVOKE SELECT ON public.co_line_items, co_labor_entries, co_material_items,
                 co_equipment_items, co_nte_log FROM authenticated;
GRANT  SELECT ON public.<each>_gc_view, _tc_view, _fc_view TO authenticated;
GRANT  ALL    ON <base tables> TO service_role;
```

Writes still go to base tables under existing RLS (no change to mutations, so no break to picker-v3 or `apply_co_contract_delta`).

**Client migration:** introduce `useCOFinancialsV2` that queries the role-appropriate view. Replace reads in `useChangeOrderDetail`, `COKPIStrip`, `COSidebar`, `COProfitabilityCard`, `COHeroBlock`, `CreateInvoiceFromCOs`, and the CO download edge functions. `useCORoleContext` stops being the only line of defence — UI hides become a redundant second layer.

**De-risk:** roll out per-org with `co_v4`. Add a contract test that asserts a GC JWT cannot select `unit_cost` from any CO-cost table.

---

## Phase 2 — AI intake (standalone page)

**Goal:** GC pastes messy owner/architect text → AI splits into reviewable draft line items → GC edits → exits into the existing CO Detail.

**New surface:**
- Route: `/project/:id/change-orders/intake` (gated by `co_v4`).
- Table `co_ai_intakes(id, project_id, org_id, raw_text, voice_url, model, status, output_json, created_by, created_at, finalized_co_id)`. RLS scoped to participant + creator org.
- Edge function `co-ai-intake` (Lovable AI Gateway, `google/gemini-3-flash-preview`, `generateText` + `Output.object`). Takes raw text + project context snapshot (contracted scope, building/unit list, catalog slice, window/door schedule, as-designed specs). Returns `{ lines: [{ title, problem, suggested_system, location_hint, qty, unit, catalog_slug, scenario_id, confidence, reasoning }] }`. Reuses the prompt discipline from `mem://features/ai-scope-description-style`.
- Review screen: editable table of proposed lines; "Create CO" button calls the existing `change_orders` insert path with `entry_source='ai_intake'`, inserts `co_line_items` with `source='ai_split'`, sets `ai_intake_id`, then routes to the **existing** `CODetailPage`.

**Field PN/RFI voice variant:** add a "Voice → PN" entry on `FCHomeScreen` that uploads audio to the existing `co_evidence` bucket, calls the same edge function with a transcription step (Gemini 3 Flash supports audio), and produces a Problem Notice that lands as an unapproved draft CO for the GC inbox. No change to the RFI table — the PN is just a draft CO with `entry_source='field_pn'`.

---

## Phase 3 — Guided ≤5-step builder (problem-first)

**Goal:** the tap-driven creator for when there's no paste. One line at a time, fed by project setup.

**New surface:**
- Route: `/project/:id/change-orders/guided` and `/project/:id/change-orders/:coId/guided/add-line`. Both gated by `co_v4`.
- Components live in `src/components/change-orders/guided-v4/` so picker-v3 is untouched.

**Steps (drives a single `co_line_items` insert):**
1. **Problem** — picks from scenario library (Phase 4 table) + free text.
2. **System** — sub-element (truss, fascia, window head, etc.), filtered by problem and by what the project actually has (joins `project_scope_details`, `project_framing_scope`, `contract_scope_selections`, window/door schedule).
3. **Where** — uses existing `VisualLocationPicker` + building/unit picker; supports multi-unit selection with a `group_key` so one line can fan out.
4. **Fix** — pulls catalog items pre-filtered by problem+system+zone (reuse `useScopeSuggestions` and `catalog_definitions.applicable_zone/work_types/reasons`).
5. **Review** — auto-summary using existing AI scope-description style (1–3 sentences).

This step set is configurable in `co_v4_step_config` so we can tune without redeploy.

**Reuse:** `VisualLocationPicker`, `ScopeCatalogBrowser`, `useScopeSuggestions`, `useScopeCatalog`, `useCOResponsibility`, `coLabel`, `generateCONumber`. All existing.

---

## Phase 4 — Scenario library + drill-down framing builder

**Goal:** the ~106-scenario spreadsheet becomes a queryable table that powers step 1 and the framing drill-down (siding, fascia, soffit, windows, decorative, balconies).

**New tables:**
- `co_scenarios(id text pk, name, project_types text[], problem_tags text[], system_tag, default_unit, default_qty_formula, sort_order, is_platform, org_id null)`.
- `co_scenario_lines(scenario_id, line_no, catalog_slug, qty_expr, role_hint, notes)` — the prebuilt line items each scenario carries.
- `co_scenario_builder_map(scenario_id, step_no, prompt, child_scenario_ids text[])` — the "steps/sub-elements that generate far more".

Seed via a CSV import script (`supabase/functions/import-co-scenarios`).

**Drill-down framing builder** is a Phase-3 step variant that, when problem ∈ {siding, fascia, soffit, windows, decorative, balcony}, replaces step 2 with the recursive `co_scenario_builder_map` walker, pre-filling qty from the project's window/door schedule and as-designed specs.

---

## Phase 5 — Combined CO SOV + invoicing rollup

**Goal:** approved COs roll up into a contract-level SOV for tracking and invoicing.

**New tables:**
- `co_sov(id, project_id, contract_id, status, created_at, updated_at)` — one per `project_contracts` row.
- `co_sov_lines(id, co_sov_id, source_co_id, source_co_line_item_id, title, scheduled_value, billed_to_date, retainage_pct, sort_order)` — populated by a DB trigger on CO approval (extending the existing `apply_co_contract_delta` path; we **add** a new trigger, do not edit the existing one).
- `co_sov_invoice_links(co_sov_line_id, invoice_line_item_id, amount)` — wires CO billing into existing `invoices` / `invoice_line_items` without changing their schema.

`CreateInvoiceFromCOs` switches (behind flag) to read from `co_sov_lines` instead of aggregating raw `change_orders`, giving stable billed-to-date math and matching the SOV invariants in `mem://features/sov/financial-alignment-and-integrity`.

A `co_sov_<role>_view` set follows the Phase-1 pattern so GC sees price + running total only, never TC cost.

---

## Phase 6 — CO Overview page parity

The current `CODetailLayout` already is the "destination that feels like the project page" (Hero, KPI strip, sidebar, SOV, Materials, Equipment, Labor, NTE, Profitability, Activity). v4 changes are:
- Swap underlying data hooks to the role-view variants from Phase 1.
- Add an "Entry source" pill + intake artifact link (paste text / voice playback) when `entry_source != 'picker_v3'`.
- Add the combined CO SOV mini-card linking to the project's CO SOV page.

No structural rewrite. Existing routes and components remain the source of truth.

---

## Phase 7 — Cutover & cleanup
- Per-org `co_v4` rollout, then default-on.
- Picker-v3 stays available as `/change-orders/new-classic` for one release for fallback, then archived under `_archived/change-orders/`.

---

## Technical notes

**Migration order matters.** Each phase is one or two migrations; never combined with code in the same turn. Phase 1's REVOKE must ship in the same migration as the GRANTs on views or reads break for one deploy window.

**RLS helpers reused:** `is_project_participant`, `has_role`. New: `co_viewer_role`, `can_see_co`, both `SECURITY DEFINER` with `set search_path = public` to avoid the recursion class documented in `mem://database/project-membership-source-of-truth`.

**AI:** Lovable AI Gateway via existing `_shared/ai-gateway.ts`. Default `google/gemini-3-flash-preview`. All prompts include the project-context snapshot already used by `generate-scope-description` and `suggest-scope-items`.

**Edge functions added:** `co-ai-intake`, `co-pn-voice-transcribe`, `import-co-scenarios`. Existing `po-download`, `work-order-download`, `send-co-*` untouched.

**Riskiest changes & de-risk:**
1. *Phase 1 REVOKE* could break a forgotten read path → ship behind `co_v4` per-org, run a query-log diff in staging, keep a one-migration rollback that re-GRANTs SELECT. Add an automated RLS contract test.
2. *Combined CO SOV trigger* could double-count if it races `apply_co_contract_delta` → make it a separate `AFTER UPDATE` trigger keyed to `status` transitions only, idempotent on `(co_sov_id, source_co_id)` unique index.
3. *AI intake hallucination* → require GC review step before any CO row exists; persist raw input + model output in `co_ai_intakes` for audit; reuse the temp=0.3 / strict-prompt rule from memory.

## Things I'd do differently from the docs
- **One CO = many lines, not many COs = one combined SOV.** The mini-project model already supports this; I'd push back on creating a parallel "combined CO SOV" entity unless you specifically need to merge across multiple parent COs. The Phase-5 table is built so it can act per-CO *or* per-contract — confirm which.
- **Don't replace the picker for "add items to existing CO."** Picker-v3's `add-items` flow is solid; route only the *create-from-scratch* flow through guided-v4.
- **Voice PN ≠ RFI.** Treating it as a draft CO with `entry_source='field_pn'` avoids dragging the RFI subsystem into the CO lifecycle.

## Open items I still need from you
- Confirm Phase-5 scope: per-contract rollup, per-CO rollup, or both.
- Confirm `co_v4` is org-scoped (matches existing feature_overrides) vs project-scoped.
- Scenario library CSV: do you want me to ingest from a `/mnt/user-uploads/...` upload, or stage it as seed data in a migration?
- Should the field PN voice flow require GC approval before becoming a draft CO, or land directly in the GC's "needs review" inbox as a draft?
