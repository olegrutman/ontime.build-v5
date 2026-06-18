# CO v4 — Remaining Build Plan (locked answers)

Decisions locked from your reply:
- **Scenario library**: you have the 106-scenario workbook → upload to `/mnt/user-uploads/` and import via edge function
- **Field PN voice**: lands directly as a draft CO in the **GC inbox** (no intermediate TC review)
- **Combined CO SOV**: build **both** per-CO rollup *and* per-contract rollup views

## Where we are today (already shipped)

- `co_v4` org flag + `useCoV4Flag` / `useCoV4Context`
- Phase 1 visibility wall: `*_role_view` views + all primary read sites migrated through `useCOFinancialsV2`
- Phase 2 AI intake: `co_ai_intakes` table, `co-ai-intake` edge fn, `/change-orders/intake` page
- Phase 5 spine: `co_sov_lines`, `co_sov_invoice_links`, `co_sov_contract_rollup` view + sync trigger
- Scenario tables created (empty): `co_scenarios`, `co_scenario_lines`, `co_scenario_builder_map`
- Picker-v3 cleanup done; `index.ts` rebuilt; template-literal bug fixed

## Build order

### Step 1 — Scenario library import (unblocks Phase 3 & 4)
- You upload the workbook to `/mnt/user-uploads/co-scenarios.xlsx`
- New edge function `import-co-scenarios` parses the workbook and upserts into `co_scenarios` (one row per scenario), `co_scenario_lines` (pre-built line items per scenario), and `co_scenario_builder_map` (sub-element walker rows)
- Idempotent on `co_scenarios.id` so re-runs are safe
- One-shot admin trigger via Platform Setup page, no recurring schedule

### Step 2 — Phase 3 guided 5-step builder
- New routes `/project/:id/change-orders/guided` and `/:coId/guided/add-line`, gated by `co_v4`
- New folder `src/components/change-orders/guided-v4/` (picker-v3 untouched)
- Steps: **Problem** (from `co_scenarios` filtered by project type) → **System/sub-element** (joined to `project_scope_details`, `project_framing_scope`, `contract_scope_selections`, window/door schedule) → **Where** (reuse `VisualLocationPicker`, multi-unit writes shared `group_key`) → **Fix** (`useScopeSuggestions` filtered by problem+system+zone) → **Review** (AI summary via `generate-scope-description`, temp 0.3, 1–3 sentences)
- No pricing in the wizard — deferred to detail page (matches CO/WO wizard memory rule)
- When problem ∈ {siding, fascia, soffit, windows, decorative, balcony}, Step 2 swaps to the recursive `co_scenario_builder_map` walker, pre-filling qty from window/door schedule

### Step 3 — Field PN voice flow
- New "Voice → PN" entry on `FCHomeScreen` *and* TC dashboard (per "TC can raise too")
- Audio uploads to existing `co_evidence` bucket
- Calls `co-ai-intake` with audio input (Gemini 3 Flash supports audio natively); produces a draft CO with `entry_source='field_pn'` and `problem_voice_url` set
- **Lands directly in GC inbox** as a needs-review draft — RFI subsystem untouched
- GC inbox surfaces with an "Entry source: Field PN" pill and inline audio player

### Step 4 — Combined CO SOV (both granularities)
- Keep existing `co_sov_lines` (per-CO source rows) + `co_sov_contract_rollup` view (per-contract totals)
- Add `co_sov_per_co_view` for per-CO summaries (scheduled value, billed-to-date, retainage, status) — one row per CO
- `CreateInvoiceFromCOs` (already routes through role views) gains a toggle: bill from one CO vs aggregate across all approved COs on the contract
- CO Detail gets a "Combined CO SOV" mini-card linking to a new `/project/:id/change-orders/sov` page showing both lenses (per-CO list + per-contract totals)

### Step 5 — Lifecycle hardening on CO Overview
Additive tweaks to existing `CODetailLayout`:
- Entry-source pill (Picker / AI intake / Guided / Field PN) with intake artifact link (paste text or audio playback)
- **T&M / NTE live daily-hours strip**: FC enters → TC sees same day → GC sees same day, enforced by Phase-1 views (no cost/margin leaks)
- **NTE gate**: warn at 80% used, hard-block submit at 100% (extend `useCORoleContext.nteBlocked` to drive banner + submit guard)
- **Fixed-type submit guard**: block until every `co_material_items` row has `quote_status='quoted'` or better (Confidence ladder)
- **Two-step completion handshake**: FC marks "work complete" → TC confirms → status flips to `completed`, snapshots freeze, invoice generation reads only frozen rows

### Step 6 — Cutover
- `co_v4` already on for the three test orgs; flip default to `true` for all orgs once Steps 1–5 ship
- Picker-v3 remains as `/change-orders/new-classic` for one release, then archive under `_archived/change-orders/`

## Technical notes

- All Step 2 / Step 3 / Step 4 reads continue to route through `useCOFinancialsV2` or the new role-scoped views — no client gets cost/markup over the wire
- Mutations stay on base tables under existing RLS; `apply_co_contract_delta` untouched
- AI prompts follow the temp=0.3 / strict-from-selected-items rule already in memory
- Each step ships behind `co_v4`; rollback is a single flag flip

## What I need from you to start

1. Upload the 106-scenario workbook to `/mnt/user-uploads/co-scenarios.xlsx` (or confirm a different filename) — that unblocks Step 1
2. Approve this plan and tell me to start with **Step 1 (scenario import)** or jump ahead

Recommend: ship Step 1 first (one edge function + one-shot import), then Step 2 (guided builder) — that's the biggest visible UX win and everything else stacks on it.
