

## Goal
Collapse Scope sections (Structure / Roof / Envelope / Backout / Exterior) into an accordion so only one is open at a time. Keeps questions + SOV preview visible together — no scrolling away from either.

## Change — `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx`

Replace the current flat `SCOPE_STEPS.map(...)` loop (lines ~78-98) that renders all sections stacked, with a single-open `Accordion`:

- Use `Accordion` from `@/components/ui/accordion`, `type="single"`, `collapsible`.
- Default open: first non-empty section (Structure in most cases).
- Trigger shows: section name + small muted progress counter on the right (e.g. `Structure   3 / 5`).
- Content: existing `WizardQuestionComponent` list, unchanged.
- Skip empty sections entirely (same as today).
- Auto-advance: when every visible question in the open section has a non-null answer, automatically open the next non-empty section. Implemented with a `useEffect` watching `answers` + the current `openSection` state.
- Drop the `overflow-y-auto pr-2` wrapper on the question column — no longer needed since collapsed sections keep the column short. Keep the heading + intro line at top.

### Resulting layout (left column)
```
Scope
Answer questions… SOV updates live.

▼ Structure          3 / 5
   • Number of stories
   • Has basement?
   • Mobilization as separate item?
   …
▶ Roof               0 / 3
▶ Envelope           0 / 1
▶ Backout            0 / 4
▶ Exterior           0 / 3
```

SOV preview column (right) is unchanged — it already uses `h-[calc(100vh-280px)]` with internal scroll, so it now naturally stays in view because the left column is short.

## Files modified
- `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx` — only the section-rendering block (~25 lines) + tiny `useEffect` for auto-advance.

## Files NOT touched
- `WizardQuestion.tsx`, `SOVLivePreview.tsx`, `useSetupWizardV2.ts` — pure presentation change.
- Contracts step, Building Type step — unaffected.
- Mobile (`<lg`): single column already; accordion still works, SOV stacks below — fine.

## Verification
- At 1366×768 and 1918×970: with Structure open, both the questions AND the full SOV preview fit on screen without scrolling either.
- Closing Structure / opening Roof keeps the same compact footprint.
- Counter updates as answers are filled in.
- Completing all questions in Structure auto-opens Roof.
- Empty sections (no visible questions) don't render at all.

