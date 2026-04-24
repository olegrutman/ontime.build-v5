## CO Wizard — Real-World UX Review & Improvements

I tested the new wizard against how a PM/super actually fills out a CO in the field (one-handed on a phone at the jobsite, 30-second window between trades). Here's what I found and what to change.

---

### Real-world mental model of writing a CO

A foreman thinks in this order:
1. **What broke / changed?** (the trigger)
2. **Where exactly?** (point at it)
3. **What do I need done?** (scope + qty)
4. **Who pays / who does it?** (commercials)
5. **Send it.**

The current wizard mostly matches this — but the Scope step duplicates Steps 1 & 2, and the Sasha flow has friction at the picks screen. Below are the issues + fixes.

---

### Critical issues found

**1. Scope step re-asks Why and Where — confusing redundancy**
`StepCatalog` has its own internal phases (`location → reason → items`) that fire when location/reason are missing. In the wizard, both are already collected in Steps 1–2, so the scope step jumps straight to `items` — but the code path still exists, the chips show ✕ buttons that send users back to phase 1 *inside* the step (orphaning the wizard's Step 2). Users get lost.

*Fix:* When mounted inside the wizard (location & reason guaranteed), strip the internal phase machine. Show the chips as **read-only** with an "Edit in Step 2" link that calls `setStep(1)` on the parent. Keep the internal phases only for the legacy non-wizard usage (or delete them if no callers remain).

**2. Mode switch (Ask Sasha / Type / Browse) lacks a clear default story**
Three modes shown side-by-side at equal weight on first open is decision paralysis. Real users want one obvious path.

*Fix:*
- Default to **Ask Sasha**, but render the switch as a **subtle tab strip below** the Sasha card (not above as a 3-up grid). 
- Show **"Browse the catalog →"** and **"Just type it →"** as small text links inside the Sasha card's footer ("Prefer to do it yourself?"). 
- This keeps the recommended flow primary and the escape hatches discoverable but quiet.

**3. Sasha question flow has no "I don't know" / "skip" answer**
Field reality: foremen often don't know the framing method on a remodel discovery. Currently they're stuck — they must pick something or back out.

*Fix:* Add a tertiary "Not sure / Skip" answer to every question (rendered smaller, muted). The flow records `unknown` and continues; the AI prompt already tolerates missing context.

**4. Picks screen — confidence ring is decorative, not informative**
The 0–100 ring next to each pick reads as a score but doesn't tell the user what to *do* with low-confidence items. Real PMs need a verdict.

*Fix:* Replace the ring with a 3-tier badge:
- **Strong match** (≥75%) — green, pre-checked
- **Likely** (50–74%) — amber, unchecked
- **Maybe** (<50%) — gray, collapsed under "Show 3 more suggestions"
Keep the numeric % only in a tooltip. Pre-check strong matches so the default action is just "Continue."

**5. Quantity edit is hidden in a tiny pill**
The current `QuantityEditPopover` trigger is a 10px-bold chip — easy to miss on mobile. Quantity is the #1 thing people change.

*Fix:* Render quantity as a proper inline editor on the right side of each pick card: `[ 12 ] LF` with a clear pencil icon. On mobile, tapping opens a number keypad sheet instead of a popover (popovers misalign on small viewports).

**6. Location-refinement banner is confusing post-confirm**
The banner says "Sasha thinks this is closer to 'Rim joist' than 'Floor system'" — but accepting it silently re-runs the match and loses the user's current selection.

*Fix:*
- Move the banner **above the picks heading** so it reads as context, not an interruption.
- Show "**Update & re-match**" only if zero items are selected; otherwise show "**Update for next CO**" (just persists preference, doesn't re-run).
- Add a one-line "Why?" expandable that shows the AI's reasoning ("Plumber damage typically occurs at rim joist penetrations…").

**7. Review step doesn't show the structured Sasha summary**
The AI description text appears, but the user can't see *which* picks came from Sasha vs. browse, nor edit qty inline at review time. They have to go back two steps.

*Fix:* On Review, render selected items as a compact table with columns: Item · Qty · Unit · Source (✦ Sasha / ✎ Manual / ☰ Browse). Make qty editable in place. Add a "Replace with Sasha pick" link on manual items if a higher-confidence catalog match exists.

**8. Step 1 "Work Type" is now meaningless**
The "Suggested for ___" block was retired in Phase 1 (`hintedTypes: []`), so users see a flat 10-icon grid with no guidance. Worse, work type drives `filterByContext` in browse mode and `resolveBuildingType` in Sasha — so picking the wrong one silently degrades AI quality.

*Fix:* Either:
- (a) Make work type **required** (one-tap, big icons, 5 options not 10 — group rare ones under "More…"), OR
- (b) Drop it entirely and let Sasha infer from the QA flow + reason.
Recommend **(b)** — it's the only way to keep the wizard at "thumb-speed." Restoring smart hints later requires rebuilding what Phase 1 just deleted.

**9. No "save draft & resume" affordance**
A foreman gets pulled mid-CO, taps Cancel, loses everything. No autosave.

*Fix:* Persist `data` to `sessionStorage` keyed by `co_wizard_draft_${projectId}` on every change. On open, if a draft exists, show a small "Resume draft from 2m ago?" banner above Step 1.

**10. Mobile: footer Next button is hidden behind the iOS keyboard**
When typing in StepCatalogTypeFallback's textarea on mobile, the sticky footer sits behind the keyboard. Users think the wizard froze.

*Fix:* Add `pb-[env(safe-area-inset-bottom)]` to the footer and `scrollIntoView({ block: 'center' })` on textarea focus.

---

### Smaller polish

- **Reason cards** (Step 1): "Found damage" and "Damaged by others" are framed as causes but the icons (`⚠️` `🔄`) don't disambiguate. Add a 1-line example under each: "e.g. plumber cut joist."
- **Progress bar** at top of QA flow jumps from `progress * 80` to `90` to `100` — feels jerky. Use linear `(currentIdx + 1) / (totalQuestions + 2)` mapping.
- **"Ask Sasha" amber theming** clashes with the primary blue. Either commit to amber for all AI surfaces or use the design-system `primary` for buttons and reserve amber for the ✦ icon only.
- **Breadcrumb pills** in `StepCatalogQA` use `truncate` but no max-width, so multi-word answers ("Engineered I-joists") break the row on mobile. Add `max-w-[140px] truncate`.
- **Toast on QA empty result** says "Switching to Browse mode" but doesn't actually switch focus there — user has to scroll. Auto-scroll the picker into view.

---

### Implementation order (when approved)

1. Strip duplicate phases from `StepCatalog` when used inside wizard (Issue 1)
2. Restructure mode switch to demote Type/Browse (Issue 2) + drop work-type step (Issue 8)
3. Add "Not sure" answer + linear progress + breadcrumb truncation (Issues 3, polish)
4. Replace confidence ring with 3-tier badges + auto-select strong matches (Issue 4)
5. Inline quantity editor + mobile keypad sheet (Issue 5)
6. Refinement banner repositioning + non-destructive update (Issue 6)
7. Review-step picks table with inline qty + source badges (Issue 7)
8. Draft autosave + resume banner (Issue 9)
9. Mobile keyboard / safe-area footer fix (Issue 10)
10. Polish pass (reason examples, theming consistency, toast UX)

### Files touched
- `src/components/change-orders/wizard/StepCatalog.tsx` (major)
- `src/components/change-orders/wizard/StepCatalogQA.tsx` (major)
- `src/components/change-orders/wizard/StepCatalogModeSwitch.tsx` (replace with footer-link variant)
- `src/components/change-orders/wizard/QuantityEditPopover.tsx` → split into `QuantityInline.tsx` + mobile sheet
- `src/components/change-orders/wizard/LocationRefinementBanner.tsx` (props + placement)
- `src/components/change-orders/wizard/COWizard.tsx` (Step 1 simplification, autosave hook, footer safe-area, Review table)
- `src/hooks/useQuestionFlow.ts` (skip/unknown support)
- `src/types/scopeQA.ts` (allow `'__skip__'` answer)

No DB changes. No edge function changes. Pure UX/UI.

---

**Want me to apply all 10, or pick a subset?** My recommendation if you only have time for 3: **#1 (duplicate steps)**, **#5 (quantity editor)**, **#9 (draft autosave)** — those are the ones a real foreman will trip over within the first 60 seconds.
