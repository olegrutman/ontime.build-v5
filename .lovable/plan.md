## What's wrong with Step 3 today

Looking at the screenshot of `Exterior · Roof system / Roof sheathing` + `Fix damage` + `Owner request`, three real problems compound:

### 1. The same context is shown three times, in three color systems

```text
Header (top of dialog)        : 🔧 Fix damage   Owner request   📍 Exterior · Roof…
Scope outer chip row          : 📍 Exterior · Roof…   Fix damage   Owner request   custom home
QA card inner chip row        : 📍 Exterior · Roof…   ✦ Fix damage   Owner request   custom home
```

Plus a 4th amber accent bar above the question card, the amber Sasha avatar, and the amber progress bar. That's 5 amber/orange surfaces, a red/coral reason chip, a purple building-type chip, a blue work-type chip, a gray reason chip — all on one screen.

Files responsible:
- `src/components/change-orders/wizard/COWizard.tsx` lines 666-685 (header chips)
- `src/components/change-orders/wizard/StepCatalog.tsx` lines 285-318 (scope outer chips)
- `src/components/change-orders/wizard/StepCatalogQA.tsx` lines 207-226 (QA inner chips)

### 2. The question is wrong for the location

Location is **roof sheathing**, but the QA card asks "What framing member was damaged?" and shows 2x wall stud, floor joist, I-joist, ceiling joist, rafter, roof truss, header/LVL, stair stringer.

Root cause: `src/lib/framingQuestionTrees.ts` line 11-25 — the `member` question has a single static `answers` array that never looks at `ctx.zone` or `ctx.locationTag`. So whether the user picked a kitchen partition or a roof valley, they get the same 8-option grid.

### 3. The "Type it / Browse catalog" mode switch sits at the very top, competing with the question for attention. Most users only need it as an escape, not the headline.

---

## What I will change

### A. Single, sticky context header (removes 2 duplicate rows)

- **Keep** the dialog header chips (top of `COWizard.tsx`) as the *one* place context lives. Make them a quiet uniform style: same neutral pill background for all three (intent, reason, location), with only an icon to differentiate.
- **Delete** the chip row inside `StepCatalog.tsx` (lines 285-318) entirely.
- **Delete** the chip row at the top of `StepCatalogQA.tsx` (lines 207-226). Replace with a single thin "Editing scope for: 📍 {location} · {intent}" line in muted text — no pills.
- Drop the building-type chip ("custom home") from the visible UI; keep it as data only. It doesn't help the framer in the moment.

Result: one place to read context, one click to change it ("Edit in earlier steps" link in the dialog header).

### B. Unify the color system

One accent color for the active step (amber/Sasha), neutrals for everything else.

- Reason badge inside the scope step → drop the colored bg, use a small leading dot in the reason color and neutral text. The big colored "Fix damage" pill belongs only in the list/detail views, not inside an active wizard step where it competes with the question.
- Drop the blue work-type pill in StepCatalog (line 310-314).
- Keep amber only on: Sasha avatar, primary CTA, and the question card's top accent. Remove the amber bg from the location pill (line 208), the amber bg from the intent pill (line 212), and the amber-tinted border on the summary card or unify it with `bg-card`.

### C. Make the question tree zone-aware (the real fix)

In `src/lib/framingQuestionTrees.ts`, the `member` question's answer list must be filtered by `ctx.zone` before render. Two options — I'll go with the smaller surgical one:

**Approach (small):** turn the static `answers` array into a function the QA renderer can resolve at render time. Add an optional `answersFor?: (ctx: FlowContext) => ScopeAnswer[]` field on `ScopeQuestion`. When present, `StepCatalogQA.tsx`'s `QuestionCard` uses it instead of `question.answers`.

Then for the `member` question (and the `damage` flow generally), authoring becomes:

```text
zone = roof          → rafter, roof truss, ridge beam, sheathing panel, fascia, valley
zone = interior_wall → 2x stud, header, top/bottom plate, blocking
zone = interior_floor→ floor joist, I-joist, rim board, subfloor, blocking
zone = exterior_wall → 2x stud, header, sheathing panel, sill plate
zone = stairs        → stringer, tread, riser, landing
zone = structural    → beam, column, hold-down, shear panel, post
```

I'll add a small zone→members map in `framingQuestionTrees.ts` and wire `answersFor` for the four flows that ask the "member" question (`custom_home.damage`, plus the equivalents in `track_home`, `townhomes`, `apartments_mf` if they exist — I'll check while implementing).

Same treatment for the second question ("What did the other trade do to it?") — for `roof` zone, "drilled oversized" and "hole near bearing" don't apply to a sheathing panel; we'd show "torn / punctured", "cut for penetration", "damaged at fastener line", "blown off / wind damage", "broken / cracked", "delaminated".

### D. Tighten the question card itself

- Remove the amber 3px top accent bar (line 457). The amber Sasha avatar is enough signal.
- Move the "Type instead" / "Browse catalog" links from the prominent row at the top of StepCatalog (visible in screenshot top-right) into the existing escape row at the bottom of the QA card (`StepCatalogQA.tsx` lines 411-425). One escape row, not two.
- Keep "Not sure / Skip this" — but place it as a quiet text link below the answer grid, not a centered button (already close, just style adjustment).

### E. Step 3 frame

In `StepCatalog.tsx`, when `lockedFromWizard` is true (which is the wizard case), skip the location/reason re-prompt phases entirely and render only the QA component. Remove the now-redundant top chip row and mode switch — let QA own its own top area.

---

## Visual target (Step 3, after)

```text
┌──────────────────────────────────────────────────────────────┐
│  New Change Order                                            │
│  IMS, LLC · Step 3 of 5 · Scope                              │
│  🔧 Fix damage  · 👤 Owner request  · 📍 Exterior · Roof…    │  ← one quiet row
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Editing scope for: Exterior · Roof system / Roof sheathing  │  ← muted line
│                                                              │
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━ progress                       │
│                                                              │
│  ✦  Question 1 of 4                                          │
│      What part of the roof system is damaged?                │
│      ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│      │Sheathing │ │ Rafter   │ │  Truss   │ │  Fascia  │     │
│      │  panel   │ │          │ │          │ │          │     │
│      └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│      ┌──────────┐ ┌──────────┐                               │
│      │  Ridge   │ │  Valley  │                               │
│      └──────────┘ └──────────┘                               │
│                                                              │
│      Not sure / Skip this                                    │
│                                                              │
│  ← Back   ⌨ Type instead   📋 Browse catalog                 │
└──────────────────────────────────────────────────────────────┘
```

One accent color (amber for the question), one neutral system for everything else, content matches the location.

---

## Files I'll touch

| File | Change |
|---|---|
| `src/types/scopeQA.ts` | Add optional `answersFor?: (ctx: FlowContext) => ScopeAnswer[]` to `ScopeQuestion`. |
| `src/lib/framingQuestionTrees.ts` | Add `MEMBERS_BY_ZONE` and `ACTIONS_BY_ZONE` maps; wire `answersFor` on the `member` and `action` questions in the damage flows. |
| `src/components/change-orders/wizard/StepCatalogQA.tsx` | Remove inner chip row; replace with one muted location line. Pass `ctx` into `QuestionCard`; resolve `answersFor` at render. Remove amber accent bar. Keep one bottom escape row. |
| `src/components/change-orders/wizard/StepCatalog.tsx` | When `lockedFromWizard` is true, drop the outer chip row and mode switch; render QA directly. Move escape links into QA's footer. |
| `src/components/change-orders/wizard/COWizard.tsx` | Make the header chip row the single source of context — uniform neutral styling for all three pills, no special colors per reason. |

No DB or edge function changes. No test changes (the existing `resolveZone.test.ts` continues to pass since we're not touching `resolveZone`).

---

## What I'm explicitly *not* changing

- Step 1 (Why) and Step 2 (Where) flows — they're working.
- The catalog suggestion AI call — same payload, same edge function.
- The "intent" picker model — still drives which flow runs. We're just making each flow's questions zone-aware.
- The colored reason pills on the CO list/board/detail pages — those *should* be loud there. The change is scoped to inside the wizard.
