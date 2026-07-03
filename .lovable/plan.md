
## Problem

Today the Setup Wizard v2 assumes the contractor is building the whole shell. There is no way to say "exterior walls are concrete/CMU and out of my scope, but I'm doing interior partitions and roof trusses." As a result, SOV lines for exterior framing/sheathing/WRB get generated anyway and the contractor has to fight the numbers.

The same gap shows up in reverse for interior-only trims, roof-only re-roofs, and additions where the shell already exists.

## Approach — "Scope Boundaries" step

Add one new step to the wizard, **between Building Basics and Structure**, called **"What are you actually building?"**. It captures scope inclusions/exclusions BEFORE any scope questions are asked, so downstream phases (`structure`, `envelope`, `roof`, `backout`, `exterior_finish`) can be conditionally hidden and their SOV weight redistributed.

### Questions asked (in order, with smart skipping)

1. **Exterior walls — who's building them?**
   - I'm building them (wood / cold-formed steel framing)
   - Someone else — concrete / CMU / tilt-up already in place
   - Someone else — structural steel + infill by others
   - N/A (interior-only project)

2. **If "someone else": what wall material is going up?** (drives finish/fastening logic — concrete, CMU, tilt-up, steel + metal panel, curtain wall)

3. **Interior partitions — in your scope?** Yes / No / Partial (specify floors)

4. **Roof structure — in your scope?**
   - Yes — trusses
   - Yes — rafters / stick-framed
   - Yes — steel joists / deck
   - No — by others
   
5. **Roof covering — in your scope?** Yes / No (only asked if roof structure = yes or by others)

6. **Envelope layers — sheathing / WRB / insulation / siding:** multi-select of what's in scope. Auto-unchecked and hidden when Q1 says "by others" for exterior walls.

7. **MEP backout coordination — in your scope?** (already exists for MF/commercial; move it here)

Questions 2–7 are conditionally shown based on Q1/Q4. If a contractor picks "wood framing whole shell" in Q1 + "trusses" in Q4, they only see Q3, Q6, Q7 — three taps.

### How this drives the SOV

Extend `Answers` with a new `scope_boundaries` object:

```ts
scope_boundaries: {
  exterior_walls: 'self' | 'by_others_concrete' | 'by_others_cmu' | 'by_others_steel' | 'na',
  interior_partitions: 'full' | 'none' | 'partial',
  roof_structure: 'trusses' | 'rafters' | 'steel_joist' | 'by_others',
  roof_covering: boolean,
  envelope_layers: ('sheathing'|'wrb'|'insulation'|'siding')[],
  mep_backout: boolean,
}
```

In `useSetupWizardV2.ts`:

- `getVisibleQuestions()` filters phase questions by these flags (e.g. skip all `envelope` questions when `exterior_walls !== 'self'` and no envelope layers selected).
- `generateSOVLines()` skips excluded phases entirely and passes the excluded set to the SOV weighting engine so remaining phases absorb the freed weight proportionally (the existing `SOVWeighting` logic already normalizes to 100% — we just remove lines before normalization).
- Add per-line tags like `by_others: true` for anything intentionally excluded, surfaced in the SOV preview as a struck-through "By others" row so the GC/TC can see it was considered and dropped (avoids confusion).

### UI changes

- New `ScopeBoundariesPanel.tsx` rendered as a dedicated step in `SetupWizardV2.tsx` (before the current Scope step). Uses the same accordion-free "one card, big radio tiles" pattern as `BuildingTypeSelector`.
- `SOVLivePreview` gains an optional "By others" section (collapsed by default, gray, no dollars) so users can verify nothing was silently dropped.
- Summary step lists inclusions/exclusions plainly ("Exterior walls: by others — CMU · Interior partitions: full · Roof: trusses").

### Files touched

- `src/hooks/useSetupWizardV2.ts` — extend `Answers`, add `scope_boundaries` questions to the tree, gate phase visibility, feed exclusions into `generateSOVLines`.
- `src/components/setup-wizard-v2/SetupWizardV2.tsx` — insert the new step in `WIZARD_STEPS`, route to the new panel.
- `src/components/setup-wizard-v2/ScopeBoundariesPanel.tsx` — new file.
- `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx` — respect exclusions when computing `nonEmptySteps`; empty phases just don't render.
- `src/components/setup-wizard-v2/SOVLivePreview.tsx` — render "By others" ghost rows.
- `src/components/setup-wizard-v2/WizardSummary.tsx` — show scope boundaries block.
- `src/lib/sovWeighting.ts` (or wherever `generateSOVLines` re-normalizes) — accept excluded-phase set and re-normalize to 100%.

### Edge cases handled

- **Interior-only remodel**: Q1=`na`, Q3=`full`, Q4=`by_others` → SOV shows only interior partitions + backout + finishes.
- **Roof-only**: Q3=`none`, Q4=`trusses`, Q5=`yes`, envelope layers=[] → SOV is roof structure + covering only.
- **Concrete shell + wood interior + wood trusses** (the user's example): Q1=`by_others_concrete`, Q2=`concrete`, Q3=`full`, Q4=`trusses`, Q5=`yes`, envelope layers=`[insulation]` → exterior framing/sheathing/WRB/siding all excluded; interior + trusses + roof covering + interior insulation carry the weight. This is exactly the scenario that's broken today.
- **T&M / Remodel Mode**: the Scope Boundaries step is still shown (it's just as relevant), but drives WO scope catalog filtering instead of SOV weights.

### Non-goals for this pass

- Not touching CO/WO scope pickers — they already have their own scenario→system filtering. If it works well here we can port the concept later.
- Not persisting boundaries to a new DB column — they live in `project_setup_answers` JSON like other wizard answers. A dedicated column can come later if reporting needs it.

## What I need from you before building

One decision: do you want the "By others" ghost rows visible in the SOV preview (transparent, no dollars) so GCs/TCs can confirm nothing was dropped silently, or should excluded scope disappear entirely from the SOV? My recommendation is ghost rows — it's a trust/clarity win with almost no cost — but it's your call.
