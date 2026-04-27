## What's broken (in plain English)

You picked **Exterior · Roof system · Roof** in Step 2 and **Tear out / demo** in Step 1. Sasha then asked "What are you tearing out?" and offered: **Partition wall, Bearing wall, Soffit/bulkhead, Cabinets, Flooring, Fixtures, Ceiling, Other**.

None of those belong on a roof. You can't "tear out cabinets" from a roof system. This is the same class of bug as the framing screen — the wizard collected the location and intent, then ignored both when it built the question.

## Root cause (one sentence)

`TEAR_OUT_FLOW` in `src/lib/intentFlows.ts` is a **single static interior-demo list**. It does not branch on the location zone (roof vs. interior vs. exterior wall vs. site), and the location-component pre-seed map (`COMPONENT_MAP`) only routes roof/wall components into `envelope_work` and `repair_damage` — it has **no entries that route into `tear_out` at all**. So tear-out always shows interior cabinets/flooring/fixtures regardless of where you said the work is.

Two smaller related issues fall out of the same root cause:
1. `tear_out` skips the smarter component pre-seed entirely (no zone awareness, no skip-the-first-question shortcut that the other flows now have).
2. The "envelope" intent has roof sheathing, but there is no demo equivalent — so a user wanting "tear off roof sheathing and decking" has no clean path.

## The fix (3 parts)

### Part 1 — Make `TEAR_OUT_FLOW` zone-aware

Use the existing `answersFor(ctx)` and `textFor(ctx)` hooks already supported by `ScopeQuestion` (the same pattern the framing trees use). The first question becomes context-driven:

- **ctx.zone === 'roof'** → "What roof component are you removing?"
  Roof sheathing/decking, Underlayment / felt, Shingles / membrane (if in scope), Fascia / sub-fascia, Soffit material, Rafter / truss (spec, PE flag), Ridge cap, Other.
- **ctx.zone === 'exterior_wall'** → "What exterior component are you removing?"
  Siding, WRB / housewrap, Wall sheathing, Window / door (rough opening), Trim / casing, Flashing, Wall stud (spec, PE flag if bearing), Other.
- **ctx.zone === 'interior_wall' / 'ceiling' / 'floor' / null** → keep today's interior list (Partition wall, Bearing wall, Soffit/bulkhead, Cabinets, Flooring, Fixtures, Ceiling, Other).
- **ctx.zone === 'site' / 'foundation'** → site list (Concrete slab section, Footing, Hardscape, Grading, Other).

Disposal, extent, and protection questions stay the same (they apply to all demo).

The `summarize()` function gets a small `componentLabelMap` per zone so the AI sentence reads naturally ("Demo of roof sheathing at the Roof…" instead of "Demo of existing work…").

### Part 2 — Add tear-out entries to `COMPONENT_MAP` so Step 2 pre-seeds Step 3

Right now `resolveComponent("…Roof system · Roof")` returns nothing useful for tear-out. Add tear-out-aware mappings that run **only when the picked intent is `tear_out`** (or extend `suggestIntentForComponent` to keep `tear_out` separate from the framing family).

Specifically, when the trailing component matches roof / sheathing / siding / WRB / etc. AND intent is `tear_out`, pre-seed the new context-aware first question to the matching answer (e.g., `roof_sheath`, `siding`, `wrb`). This gives the same one-question-skip + "Pre-filled from your location" chip the other flows already have.

### Part 3 — Reconcile intent ↔ location for obvious mismatches

Today `suggestIntentForComponent` only swaps between framing-family and envelope/structural. Extend it so that when the user says **tear_out** but the location is clearly an envelope layer (roof sheathing, WRB, siding), we either:
- keep `tear_out` (preferred — demo is its own intent), OR
- offer a soft-swap suggestion to `envelope_work` if the answer chosen is "remove and reinstall WRB/sheathing" rather than pure demo.

Implementation: keep `tear_out` and just trust Part 1+2 to make the questions correct. No forced swap — that's the right call because "tear out roof sheathing" is genuinely demo, not envelope work.

## Files to change

| File | Change |
|---|---|
| `src/lib/intentFlows.ts` | Rewrite `TEAR_OUT_FLOW.questions[0]` to use `answersFor(ctx)` + `textFor(ctx)` keyed on `ctx.zone`. Update `summarize()` to map labels by zone. Add 8–10 new entries to `COMPONENT_MAP` for tear-out (roof sheath, underlayment, siding, WRB, fascia, soffit, slab, hardscape). Adjust `suggestIntentForComponent` to leave `tear_out` alone (no auto-swap into envelope). |
| `src/types/scopeQA.ts` | No changes — `answersFor`/`textFor` already exist on `ScopeQuestion`. |
| `src/hooks/useQuestionFlow.ts` | No changes — already supports seed-from-component. |
| `src/components/change-orders/wizard/StepCatalogQA.tsx` | Verify the renderer reads `question.answersFor?.(ctx) ?? question.answers` and `question.textFor?.(ctx) ?? question.text`. If it currently only reads the static arrays, add the two fallbacks (one-line each). |

## Tests

- Add a unit test in `src/test/` that constructs `FlowContext` for each zone (roof, exterior_wall, interior_wall, site) with intent `tear_out`, calls `getIntentFlow('tear_out', 'apartments_mf')`, then asserts the first question's `answersFor(ctx)` returns the zone-appropriate list (no "Cabinets" on roof; no "Roof sheathing" on interior wall).
- Add a `resolveComponent` test for `"Exterior · Roof system · Roof sheathing"` returning the roof-sheath pre-seed.

## What you'll see after the fix

Same scenario — Exterior · Roof system · Roof + Tear out:
- Header: "Editing scope for **Exterior · Roof system · Roof** · Tear out / demo" (unchanged).
- Question 1 becomes "**What roof component are you removing?**" with roof-only answers. If Step 2 was specific enough (e.g., "Roof sheathing"), Q1 is auto-answered and skipped with a "Pre-filled from your location · Change" chip, matching the framing screen behavior.
- The remaining demo questions (extent, disposal, protection) stay the same.
- Sasha's generated description reads like "Demo of roof sheathing at the Roof — medium area (80–400 SF). GC dumpster on site." instead of the generic interior phrasing.

No DB changes, no edge function changes — this is a pure client fix in one file plus a tiny renderer fallback.
