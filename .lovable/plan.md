## What I tested

I walked through Step 1 → Step 2 → Step 3 in your replay and read the code that drives Step 3.

Your selections in this session:
- **Why (Step 1)** — you picked an intent + a reason (the wizard requires both before "Next")
- **Where (Step 2)** — `Exterior · Wall (exterior) / WRB / housewrap · East elevation`
- **Step 3 (Scope)** — the page mounted, briefly flashed "Loading catalog…", then rendered the question card from Sasha

## What's actually wrong (in plain English)

The "messy / no clear direction" feeling on Step 3 is real, and it comes from **three concrete problems**, not just styling. The biggest one is that the page asks you to repeat yourself.

### 1. Step 3 asks you what you already told it in Step 2 (the worst offender)

In Step 2 you literally picked the building component **"Wall (exterior) / WRB / housewrap"**. Then Step 3 opens and the very first Sasha question is:

> *"Which layer of the envelope?"* — with options: WRB / housewrap, Wall sheathing, Roof sheathing, Flashing, Siding prep, Fascia/soffit, Window flashing, Self-adhered membrane.

You already said WRB. Asking again feels dumb and makes the page look noisy because the user thinks "didn't I do this two seconds ago?". This is the #1 cause of "no clear direction".

**Why it happens in code:** `StepCatalog` passes `intent` (from Step 1) to `StepCatalogQA`. That picks an intent flow from `intentFlows.ts`. The `envelope_work` flow (`ENVELOPE_FLOW`) was authored as a generic envelope wizard with no awareness that the user may have already pinned the layer at the location step. The location component never gets pre-loaded as the answer to question #1.

### 2. The intent picked in Step 1 may not match the component picked in Step 2

Step 1 lets the user pick any intent (Repair damage, Add new, Modify, Tear out, Envelope, Structural, Blocking, Inspection fix, Other). Step 2 lets them pick any component (Wall, WRB, Roof sheathing, Floor joist, Stud, Beam…). Nothing today checks that those two agree.

So a user can pick **intent = "Repair damage"** in Step 1 and then **component = "WRB / housewrap"** in Step 2. Step 3 then runs the *generic damage flow* — which still asks "what member was damaged?" with `2x stud / header / sill plate / top plate / rim band / king-jack / sheathing panel` (the `exterior_wall` member list). None of those say "WRB", so the user sees a wall-of-options that doesn't include the thing they already named. That's where the earlier "showing wall studs and floor joist need to tighten up this step" feedback came from.

### 3. The question card itself still feels heavy

The card shows: a context line with location + intent, a progress bar, a breadcrumb of past answers (empty on Q1), the question, a 4‑col grid of 8 large icon tiles, an annotation block, AND a footer escape row with "Back / Type instead / Browse catalog". On a question whose answer the system already knows, that whole stack reads as visual chaos.

## The fix (3 small surgical changes)

I'm intentionally NOT proposing a redesign. The page is fine when the right question is being asked. The fix is to ask fewer, smarter questions.

### Change 1 — Pre-fill the layer/member from the Step-2 component, then skip that question

In `StepCatalogQA.tsx`, before mounting the question flow, parse the trailing component out of `locationTag` (the part after the last "·") and try to map it to one of the answer ids on the **first** question of the resolved flow. Examples:

- `WRB / housewrap` → map to `wrb` answer in `ENVELOPE_FLOW.layer`
- `Wall sheathing` → `sheathing`
- `Roof sheathing` → `roof_sheath`
- `Window flashing` → `window_flash`
- `Floor joist` → `floor_joist` in damage flow's member list
- `2x stud / wall stud` → `2x_stud`
- `Rafter` → `rafter`
- `Beam / LVL` → `beam` (and route to STRUCTURAL_FLOW)

When a mapping is found, seed `useQuestionFlow` with that answer pre-set and start at question index 1 instead of 0. The breadcrumb pill at the top still shows "WRB / housewrap" (clickable to change), so nothing is hidden — the user just doesn't have to click it twice.

Net effect: instead of 4 questions, the WRB user sees 3, and the first thing they read is "*What's the existing condition?*" — a question they actually need to answer.

### Change 2 — Reconcile intent with the picked component (soft, no blocking)

After the user picks the component in Step 2 / before Step 3 runs, check whether the chosen intent matches the component family using a small lookup:

- `WRB / housewrap`, `Sheathing` (wall or roof), `Flashing`, `Fascia`, `Siding prep` → expects `envelope_work`
- `Beam`, `Column`, `Hold-down`, `Shear panel` → expects `structural_install`
- `Stud`, `Header`, `Plate`, `Rim`, `Joist`, `Rafter`, `Truss` → expects `repair_damage` / `add_new` / `redo_work` / `modify_existing` (any framing intent is OK)
- `Cabinet`, `Flooring tear-out` → expects `tear_out`

If the picked intent doesn't match the component family, do NOT block. Instead, switch the resolved flow for Step 3 to the matching one and surface a tiny one-line note in the Sasha card: *"Switched to **Envelope / WRB** questions because you picked WRB / housewrap. [Use damage questions instead]"*. One click reverts. This is exactly the same soft-suggestion pattern Step 1 already uses when the reason is picked first.

### Change 3 — Quiet the question card on Q1

Three small CSS/markup tweaks in `StepCatalogQA.tsx`:

- Hide the breadcrumb row entirely when `flowState.currentIdx === 0` (it's empty anyway and just adds a gap)
- Hide the "Back" button on Q1 (also useless — there's no previous question)
- Move the `annotation` block from above the answer grid to a small collapsible "Why we ask" link below the grid. Most users skip annotations; for the ones who want them, one click reveals the text.

## Files to change

- `src/components/change-orders/wizard/StepCatalogQA.tsx` — Changes 1 & 3 (component → answer mapping, seed `useQuestionFlow`, hide breadcrumb/back on Q1, collapse annotation)
- `src/lib/intentFlows.ts` — export a small `COMPONENT_TO_ANSWER` map (per-flow lookup table) and an `expectedIntentForComponent()` helper used by Change 2
- `src/components/change-orders/wizard/COWizard.tsx` — call `expectedIntentForComponent()` after Step 2 confirm; if mismatch, store the suggested intent and show the soft-switch note inside `StepCatalogQA`

No changes to: edge functions, database schema, catalog filtering logic, or the location picker.

## Acceptance test (the one you cared about)

1. Open Create CO → Step 1: pick **Repair damage** + reason **Damaged by others** → Next
2. Step 2: pick **Exterior → Wall (exterior) / WRB / housewrap → East elevation** → Save
3. Step 3 should now:
   - Show the soft note: *"Switched to **Envelope / WRB** questions because you picked WRB / housewrap"*
   - Skip the "Which layer?" question (already known = WRB)
   - Open directly on *"What's the existing condition?"* with a clean card (no empty breadcrumb, no Back on Q1)
4. Repeat with component = **Roof sheathing** → Step 3 opens on the condition question with `roof_sheath` already pinned, no studs or floor joists in the option list.
