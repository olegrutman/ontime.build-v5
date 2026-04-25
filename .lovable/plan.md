# CO/WO Wizard — Master UX Rebuild Plan

## What the screenshots prove

Your two screenshots are the smoking gun:

1. **Step 1** — User picks **Work Type = "Structural"** (a Work Order context, no `reason` chosen).
2. **Step 2 — Scope Details** — Sasha asks **"What are you adding?"** with answers `Partition wall · Closet build-out · New opening · Soffit · Niche · Blocking · Trim carpentry · Other`.

Nobody picks "Structural" because they want to build a closet. The scope question is from the **`addition` flow**, not a structural-work flow. This is the **wizard's #1 credibility killer** — it makes Sasha look broken on the second screen.

## The architectural bug, in one paragraph

`resolveScenario(reason)` in `framingQuestionTrees.ts` only knows three scenarios — `damage`, `rework`, `addition` — and **defaults everything else to `addition`**. The TM Work Order wizard (`TMWOWizard.tsx`) doesn't collect a `reason` at all; it passes `reason: 'other'` into `StepCatalog`, which gets bucketed into `addition`. So **every Work Order — Demolition, Structural, Reframing, Sheathing, Blocking, Backout — runs the same "What are you adding? Partition wall…" question tree.** The Work Type is captured but **never used to pick a flow**, only to pick a building type when it's `wrb`/`exterior`/`sheathing`.

Combined with all the other small confusions (duplicate Where/Why prompts, `TBD` chips, three competing modes, no clear "what changes if I pick this") it adds up to a wizard that looks polished but produces nonsense answers.

---

## The right mental model (real-world contractor flow)

A foreman thinks in this exact sequence — **proven by every analog change-order pad on every jobsite**:

```
TRIGGER ──▶ POINT ──▶ PROBLEM ──▶ FIX ──▶ COMMERCIALS ──▶ SEND
(why)     (where)    (what's wrong)  (what we'll do)  (how/who pays)
```

Today's wizard collapses TRIGGER + PROBLEM into "Why" and tries to derive PROBLEM from `reason + workType` — but those two inputs alone can't disambiguate "fix damaged joist" from "frame a new closet" from "tear out a soffit." That's why Sasha asks the wrong question on screen 2.

The fix is to **stop treating `reason` and `workType` as the only flow keys** and instead introduce a single **Work Intent** concept that drives Sasha's entire question tree.

---

## The new model: **Work Intent** (one decision, one flow)

Replace today's two separate inputs (Reason **AND** Work Type) with **one Work Intent picker** that makes the next question deterministic. Every intent maps 1:1 to a Sasha question flow:

| Intent | Plain-language label | Example trigger | Sasha asks about… |
|---|---|---|---|
| `repair_damage` | **Fix something that got damaged** | Plumber cut a joist | What member, what action, how much |
| `add_new` | **Add new framing/scope** | Build a closet, add a wall | What you're adding, dimensions |
| `modify_existing` | **Change something already built** | Move a window, enlarge an opening | Existing → new state, why |
| `redo_work` | **Redo work that was wrong** | Wall framed crooked | What was built, what needs to change |
| `tear_out` | **Demolish / remove** | Selective demo, cabinet pull | What's coming out, disposal needs |
| `envelope_work` | **Exterior / WRB / sheathing** | Housewrap, flashing, siding prep | Substrate, exposure, fastener spec |
| `structural_install` | **Install structural element** | Beam, post, hold-down, shear wall | Member type, load path, hardware |
| `mep_blocking` | **Blocking / backing for other trades** | TV mount blocking, grab bar | Backing type, location, fastener pattern |
| `inspection_fix` | **Backout / inspector callback / punch** | Code correction, missing nail | What inspector flagged, fix scope |
| `other` | **Something else — let me describe it** | Anything off-script | Free text → Type fallback |

This collapses the current 7 reason cards × 10 work-type cards = **70 ambiguous combinations** into **10 clean, mutually exclusive intents** where each one has a purpose-built question tree.

---

## Step-by-step proposed wizard (CO + WO unified)

The CO and WO wizards become **the same 4-step flow** with the only difference being the pricing defaults (TM vs Fixed) and the title prefix (WO- vs CO-).

### Step 1 · **What's the work?** (one-tap intent + reason + reason note)

```
┌──────────────────────────────────────────────────────────┐
│  What kind of work is this?                              │
│  ┌────────┬────────┬────────┬────────┐                  │
│  │  🔧    │  ➕    │  🔄    │  🔨    │                  │
│  │ Repair │  Add   │ Modify │ Demo   │                  │
│  │ damage │  new   │ existing│ remove │                  │
│  └────────┴────────┴────────┴────────┘                  │
│  ┌────────┬────────┬────────┬────────┐                  │
│  │  🛡️    │  ⚙️    │  🧱    │  ✅    │                  │
│  │ Envelope│Structural│Blocking│ Fix    │                  │
│  │ /WRB   │ install │ /backing│ inspect│                  │
│  └────────┴────────┴────────┴────────┘                  │
│  ┌────────┬────────┐                                    │
│  │  📐    │  📝    │                                    │
│  │ Redo  │ Other  │                                    │
│  │ work  │       │                                    │
│  └────────┴────────┘                                    │
│                                                          │
│  Who triggered this? (small radio strip, not cards)     │
│   ○ Owner   ○ GC   ○ Damage by others   ○ Field find   │
│                                                          │
│  One-line note (optional, helps Sasha):                 │
│   [ "Plumber cut joist behind shower" __________________ ]│
└──────────────────────────────────────────────────────────┘
```

**Why this works:**
- One **intent** = one flow tree (no more "Structural → What are you adding?" mismatch).
- The `reason` (who triggered) is collected but **does not change the question flow** — it only changes the legal/billing implications shown in Step 4.
- The free-text note seeds Sasha's first question and improves AI matching even before the QA flow runs.

**Code changes:**
- New `WorkIntent` type in `src/types/scopeQA.ts`.
- New `INTENT_FLOWS: Record<WorkIntent, ScopeFlow>` in a new `src/lib/intentFlows.ts` (replaces the building-type × scenario matrix as the primary lookup; building type stays but only adjusts question copy/answers, not which questions to ask).
- `resolveScenario()` becomes `resolveIntentFromLegacy(reason, workType)` for back-compat with already-saved drafts.
- Reason becomes a small radio strip with 4 options instead of 7 big cards.

### Step 2 · **Where exactly?** (unchanged — VisualLocationPicker works)

Keep `VisualLocationPicker`. Add a "Recent locations on this project" chip row above it (top 3 from `co_line_items.location_tag` for this project) — saves 4 taps for common spots.

### Step 3 · **What needs to happen?** (Sasha QA, deterministic per intent)

This is the step that's broken today. The new flow:

1. Header shows the intent + reason as **read-only chips** (no more `TBD` placeholders, no more accidental phase backtracking).
2. Sasha runs the **intent-specific question tree** (3–5 questions max, see flows below).
3. Each question has a **"Not sure / Skip"** answer and a **"Type it instead"** escape hatch in the footer (already built).
4. After QA, picks render with **Strong / Likely / Maybe** tiers (already built).
5. **Quantity is asked inside the QA flow**, not as an after-thought on the picks screen — most intents already ask "how much / how big," and that answer pre-fills `qty` directly.

**Intent → question tree summary** (full trees in `intentFlows.ts`):

| Intent | Q1 | Q2 | Q3 | Q4 |
|---|---|---|---|---|
| `repair_damage` | What member? | What was done to it? | How much affected? | Bearing? |
| `add_new` | What are you adding? | Stud type / spec? | Length / size? | Special features? |
| `modify_existing` | What's there now? | What's the change? | Touches load path? | Drawings or field decision? |
| `redo_work` | What was built wrong? | What's the corrected version? | Reuse materials? | — |
| `tear_out` | What's coming out? | Selective or full? | Disposal included? | — |
| `envelope_work` | What layer? | Substrate? | Exposure / weather? | Fastener spec? |
| `structural_install` | What member? | Connection / hardware? | Engineered drawing? | Inspection needed? |
| `mep_blocking` | What for? | Backing material? | Fastener pattern? | Coordinated trade? |
| `inspection_fix` | Inspector / authority? | What was flagged? | Scope of fix? | — |
| `other` | (skip QA → Type fallback) | | | |

### Step 4 · **How & who?** (commercials — unchanged structure, smarter defaults)

Same fields as today (pricing type, NTE cap, GC budget, materials/equipment toggles, FC input, share now). Two improvements:

- **Smart defaults from intent**: `repair_damage` and `inspection_fix` default to **T&M** with `materialsNeeded=true`. `add_new`/`tear_out` default to **fixed** with material/equipment prompts. `mep_blocking` defaults to **fixed lump sum, no materials** (it's labor-only blocking 90% of the time).
- **Inline price preview**: small sub-line under pricing type — "Most blocking jobs run $150–$400" — pulled from a tiny `co_pricing_hints` table or hardcoded for v1.

### Step 5 · **Review & send** (the editable summary table, already built)

Keep the table. Add a **"Why these picks?"** expand-to-explain section that shows the QA answers as a labeled list — this is what makes the GC trust the AI when reviewing.

---

## Smaller fixes rolled in (from the prior plan, status updated)

| # | Fix | Status |
|---|---|---|
| 1 | Strip duplicate Location/Reason phases from `StepCatalog` when in wizard | ✅ done |
| 2 | Demote Type/Browse to subtle footer links | ✅ done |
| 3 | Add "Not sure / Skip" answer to every QA question | ✅ done |
| 4 | Tiered confidence badges + auto-pre-check Strong | ✅ done |
| 5 | Quantity inline editor outside of toggle area | ✅ done |
| 6 | Non-destructive location refinement banner | ✅ done |
| 7 | Editable Review picks table with source badges | ✅ done |
| 8 | Drop redundant "Work Type" sub-step (now Intent) | ⏳ part of new plan |
| 9 | Draft autosave + resume banner | ✅ done |
| 10 | Mobile keyboard / safe-area footer | ✅ done |
| **11** | **Replace `reason+workType → addition default` with Intent → flow lookup** | 🆕 **the missing piece** |
| **12** | **Unify `COWizard` and `TMWOWizard` into one component with a `mode='co'\|'wo'` prop** | 🆕 |
| **13** | **Recent-locations chip row on Step 2** | 🆕 |
| **14** | **Intent-aware pricing defaults on Step 4** | 🆕 |
| **15** | **"Why these picks?" expandable on Review** | 🆕 |

---

## Implementation order (when approved)

**Phase A — fix the structural bug (highest leverage, lowest risk):**
1. Add `WorkIntent` type + `INTENT_FLOWS` map (port the existing 3 trees + author 7 new ones).
2. Refactor `StepCatalogQA.tsx` to look up flow by `intent` instead of `(buildingType, scenario)` — building type still adjusts answer labels.
3. Add `resolveIntentFromLegacy(reason, workType)` for any saved draft / inbound CO that doesn't have an intent yet.

**Phase B — wizard restructure:**
4. Build new Step 1 (intent picker + reason radio + note).
5. Add Recent-locations chip row to Step 2.
6. Wire intent-aware pricing defaults into Step 4.
7. Add "Why these picks?" expandable to Review.

**Phase C — unify CO + WO:**
8. Merge `TMWOWizard.tsx` → `COWizard.tsx` with a `mode` prop. Delete `TMWOWizard.tsx`. Update both call sites.

**Phase D — polish:**
9. Author the 7 new intent question trees with building-type variants.
10. Tighten `suggest-scope-items` edge function prompt to consume `intent` as a primary signal.

No DB schema changes. Edge function gets a new optional `intent` field. All existing CO/WO records keep working via the legacy resolver.

---

## What I need from you

Three quick decisions:

1. **Intent labels** — are the 10 intents above the right vocabulary for your foremen, or do you want to merge any (e.g., combine `inspection_fix` into `redo_work`)?
2. **Reason field** — keep it at all (current 7 cards), demote to a 4-option radio as proposed, or drop entirely (since intent now does the heavy lifting)?
3. **CO+WO unification** — go all the way and merge into one wizard, or keep them separate and just sync the flow logic?

Once you answer, I'll start with **Phase A** — that alone fixes the screenshot you sent.
