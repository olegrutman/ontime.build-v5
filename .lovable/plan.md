# Change Order Flow — End-to-End Logic + Real-World Readiness Pass

## What I tested

I walked the full CO/WO flow (entry → wizard → submit → CO detail). Here's what's actually broken and what's just visually off — separated so we don't conflate them.

---

## Findings

### 🔴 Blocker 1 — The WO wizard in your screenshot is the OLD wizard

The dialog you screenshotted ("New Work Order · Step 3 of 5 · Work Type → Scope Details → Location → How → Review") is **`TMWOWizard.tsx`**, not the rebuilt `COWizard.tsx`. It still has every original problem:

- No Intent picker — uses 11 `WORK_TYPES` with hardcoded sub-type lists.
- Step 2 ("Scope Details") asks "What are you adding?" regardless of work type → exactly the "Structural → Partition wall" mismatch we fixed in the CO wizard.
- Hardcodes `reason: 'other'` when calling `StepCatalog`, so Sasha's QA always falls into the legacy addition tree.
- Steps are out of order (Scope before Location) — the framing-conflict scenario can't even be entered correctly because the user picks scope before telling Sasha *where* the joist is.
- No Recent-locations chip strip.
- No assembly + state refiner (the "joists already sheathed" signal that drives the demo→repair→repair sequence).

`COListPage.tsx` line 200 chooses `<TMWOWizard>` whenever the project's `isTM` flag is true, so on T&M / Remodel projects (your Henderson Remodel) **the new wizard is never shown**. Phase C of the master plan was approved but never implemented — this is the missing merge.

### 🔴 Blocker 2 — Real-world framing sequence isn't entered as a sequence

Even on the new `COWizard`, a single CO produces a single intent + a flat list of catalog items. The mechanical-conflict scenario (open floor sheets → move joist → repair sheathing → patch finishes) is three or four sequential tasks but the wizard forces one. The trigger model + per-task pricing we agreed on after the framing discussion **has not been built yet** — the only pieces that landed were the 10-intent picker and the 7 new flow trees in `intentFlows.ts`.

Symptoms today:
- Field crew has to create three separate WOs to capture the demo → reframe → repair sequence.
- Pricing model can only be set once for the whole CO, but in reality the demo is T&M, the structural move is fixed, and the repair is unit-priced.
- No way to communicate "this CO has 3 phases, sign off on each" to the GC.

### 🟡 Blocker 3 — Screen fit / responsive issues

From your 1918×970 screenshot:
- Dialog is `max-w-4xl` (≈896 px) but the **left rail eats 224 px** of that for desktop step nav, leaving content squeezed. Cards on the right column clip — your "Living Room" card is half-visible.
- The wizard dialog isn't using the available 1918 px viewport. On wide desktop it should grow to ≈1100–1200 px, and the rail should be collapsible.
- Mobile sheet is 94 vh — fine, but the footer pad already accounts for safe area, so we're good there.
- The "Same as last time?" recent-location banner is rendered inside the location step but its layout breaks the column grid below (orange banner stretches past the grid).

### 🟡 Blocker 4 — Inconsistencies between CO and WO

Same project can produce a CO via `COWizard` (Intent first, location chip-strip, intent-aware scope) and a WO via `TMWOWizard` (work-type first, no chip-strip, generic scope). For a foreman these look like two different products.

### 🟢 What works

- New `COWizard` Step 1 (Intent + Reason) is correct.
- `intentFlows.ts` + the 10 intent trees are sound — Sasha asks the right questions when reached.
- `VisualLocationPicker` correctly resolves zones (`structural`, `interior_floor`, etc.) for downstream filtering.
- `resolveZoneFromLocationTag` + framing-aware AI suggestion edge function are wired and returning correct picks.
- Pricing math, role-based privacy, and the CO detail page are solid (separate audit, not in scope here).

---

## Plan — Three coordinated fixes

### Phase 1 — Kill `TMWOWizard`, route everything through `COWizard` (the merge)

1. Add an `isTM?: boolean` mode that already exists on `COWizard` — confirmed working. Remove the `TMWOWizard` branch in `COListPage.tsx` and always render `<COWizard isTM={isTM} … />`.
2. In `COWizard`, when `isTM` is true:
   - Default `pricingType` to `'tm'` instead of `'fixed'`.
   - Default the title prefix to `WO-`.
   - Skip the GC-only "Assigned to" requirement when the creator is a TC (FC routing already handles it).
3. Delete `TMWOWizard.tsx` and its export from `index.ts`. One wizard, one flow.

### Phase 2 — Real-world sequencing (the framing scenario)

This is the trigger + task-sequence model you approved. Implementing as a soft, non-required layer.

1. **New optional Step 2.5: "Assembly state"** — only prompts when the resolved zone is `interior_floor`, `interior_wall`, `exterior_wall`, or `roof`. One question, ≤4 chips:
   - `pre_rough` (open framing)
   - `roughed` (framed, no sheathing)
   - `sheathed_decked` (sheathed/decked, not closed)
   - `dried_in` (insulated/drywalled/finished)

   Persisted as `assembly_state` on the CO. When `sheathed_decked` or `dried_in` is selected, Sasha proposes a multi-task sequence in Step 3.

2. **Trigger picker** added to Step 1 as a small secondary chip strip (optional, non-blocking) with the seven values we agreed on:
   `trade_conflict_mech`, `trade_conflict_elec`, `trade_conflict_plumb`, `inspector_callback`, `owner_request_change`, `field_discovery`, `design_revision`.

3. **Auto-proposed task sequence in Step 3.** When `intent` × `assembly_state` indicates sequencing risk, Sasha proposes an ordered task list, e.g.:

   ```text
   Mechanical conflict @ floor system (sheathed_decked)
     1. Demo  — open floor sheathing            T&M    [edit]
     2. Structural — relocate joist             Fixed  [edit]
     3. Repair — re-sheath + screw              Unit   [edit]
     4. Finish — patch ceiling below (if any)   T&M    [edit]
   ```

   GC accepts as-is, edits, deletes a row, or adds one from a task palette. Each task gets its own pricing mode; the CO header shows a roll-up total.

4. **Per-task pricing in Step 4.** The current single pricing-type selector becomes a small table, one row per task. `nteCap` and `gcBudget` move down a level.

5. **DB additions (one migration):**
   - `change_orders.assembly_state text null`
   - `change_orders.trigger_code text null`
   - `co_line_items.task_index int null` (orders rows into the sequence)
   - `co_line_items.pricing_mode text null` (per-task override)
   - `co_line_items.task_phase text null` ('demo' | 'structural' | 'repair' | 'finish' | 'install')

   No breaking changes — existing COs read `null` and behave exactly as today.

### Phase 3 — Responsive fit + screen polish

1. **Wider dialog on large screens.** Change `DialogContent` from `max-w-4xl` to a responsive ladder: `max-w-4xl lg:max-w-5xl xl:max-w-6xl`. Keeps mobile sheet untouched.
2. **Collapsible step rail.** On `lg:` and below, hide the desktop nav rail (already collapsed via `!isMobile` — extend the breakpoint logic so the rail only shows ≥1280 px).
3. **Fix the "Same as last time" banner overflow** in Step 3 (Location). Wrap it in the same container grid so it can't push past the columns.
4. **Tighten Step 3 area-card grid.** Use `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` so cards don't truncate at the right edge.
5. **One scrollable region.** Today the dialog has nested scroll containers (outer DialogContent + inner step body). Lock to a single scroll on the step body so the footer stays pinned.
6. **Header chip cleanup.** Show Intent + Reason + Trigger as compact chips in the dialog header so the user can see the full context without scrolling back.

### Phase 4 — End-to-end QA pass (no code, just a checklist run)

For each of the four canonical scenarios I'll walk the wizard top-to-bottom and verify Sasha asks the right questions, the right items load, the right pricing defaults apply, and the CO detail page reflects everything:

| # | Scenario | Intent | Trigger | Assembly state | Expected sequence |
|---|---|---|---|---|---|
| 1 | Plumber cut a joist behind shower | `repair_damage` | `trade_conflict_plumb` | `dried_in` | demo→structural→repair→finish |
| 2 | Owner adds a closet | `add_new` | `owner_request_change` | `pre_rough` | install only |
| 3 | Mechanical duct conflict (your scenario) | `modify_existing` | `trade_conflict_mech` | `sheathed_decked` | demo→structural→repair |
| 4 | Inspector flagged missing hold-down | `inspection_fix` | `inspector_callback` | `roughed` | install + reinspect note |

---

## Implementation order

1. **Day 1** — Phase 3 (responsive fix). Lowest risk, immediate visual relief on the screens you sent.
2. **Day 1–2** — Phase 1 (delete TMWOWizard, unify on COWizard). All projects get the new flow.
3. **Day 2–3** — Phase 2 (assembly state, trigger, task sequence, per-task pricing). The real-world readiness work.
4. **Day 3** — Phase 4 (the QA matrix above). I run all four scenarios and report results back.

No external dependencies. One small DB migration. Edge function `suggest-scope-items` gets two new optional inputs (`assembly_state`, `trigger_code`) — already accepts arbitrary `answers`, so the change is additive.
