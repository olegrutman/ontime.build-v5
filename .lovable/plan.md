

# Turn Scope Page Into a Step-by-Step Wizard

## What I Understand

Right now, the Scope page shows all sections stacked on one long scrollable page with collapsible cards. You want each section (e.g. "Foundation", "Framing", "Exterior", etc.) to be its own wizard step — so the user sees one section at a time with Back/Next buttons to move between them. You also want the STD and OPT badges removed from each item — just show the item name and its toggle, clean and simple.

## Changes

### File: `src/pages/ProjectScopeWizard.tsx`

1. **Add a `currentStep` state** (starts at 0) to track which section the user is viewing
2. **Replace the `visibleSections.map()` loop** with a single-section view showing only `visibleSections[currentStep]` and its items
3. **Add a step indicator** at the top (reuse the existing `WizardProgress` component from `src/components/ui/wizard-progress.tsx`) showing section names as steps
4. **Update the sticky footer**:
   - "Back" goes to previous section (or back to profile on step 0)
   - "Next" goes to next section
   - On the last section, "Next" becomes "Save Scope & Continue" (triggers save)
5. **Remove the STD/OPT Badge** entirely from each item row — just show the item label and the switch
6. **Remove the Collapsible/accordion logic** — no longer needed since each section is its own page
7. **Update the subtitle text** — remove the "STD items are standard scope, OPT items are optional add-ons" explanation
8. **Show section title and description** prominently as a heading for each step

| File | Change |
|------|--------|
| `src/pages/ProjectScopeWizard.tsx` | Convert from scrollable list to step-per-section wizard, remove STD/OPT badges |

