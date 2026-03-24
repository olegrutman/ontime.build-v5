

# CO Wizard: TC can choose FC + Reorder scope flow

## What changes

### 1. TC can choose FC — verify connection
The TC config in `StepConfig.tsx` (lines 253-286) already has the "Field crew input needed" toggle and FC org dropdown. It queries `project_participants` for FC members and writes `data.fcOrgId`. The `COWizard.tsx` `handleSubmit` (lines 212-225) already creates the `change_order_collaborators` record when `fcInputNeeded && fcOrgId` is set. This flow is wired correctly. No structural change needed — just verify the query returns FC participants properly and the UI is accessible.

### 2. Reorder scope step: Location → Reason → Items
Currently in `StepCatalog`, each item picked triggers a per-item location→reason flow. The user wants location and reason set once at the CO level first, then item selection applies that location and reason to all items.

**New flow inside StepCatalog:**
- Phase 1 — **Location**: Show the VisualLocationPicker (or the existing inline picker). User picks location once. Stored as `data.locationTag` on the COWizardData.
- Phase 2 — **Reason**: Show reason cards (the existing 7 options). User picks one. Stored as `data.reason` on COWizardData.  
- Phase 3 — **Items**: Show the catalog browser. Items are added without per-item location/reason prompts — they inherit the CO-level location and reason automatically.

**Changes to COWizardData**: Add `locationTag: string` and `reason: COReasonCode | null` fields. Remove the per-item location/reason flow from `selectItem()` — items are added directly with the CO-level values.

### Files to modify

| File | Change |
|------|--------|
| `src/components/change-orders/wizard/COWizard.tsx` | Add `locationTag` and `reason` to `INITIAL_DATA`. Pass to StepCatalog. Use CO-level location/reason when inserting `co_line_items`. |
| `src/components/change-orders/wizard/StepCatalog.tsx` | Add 3-phase internal flow (location → reason → items). Remove per-item pending location/reason modal. Items inherit CO-level values from `data.locationTag` and `data.reason`. |
| `src/components/change-orders/wizard/StepReview.tsx` | Show the CO-level location tag and reason in the review summary. |

### Technical details

**StepCatalog phases:**
- Internal state `phase: 'location' | 'reason' | 'items'`, starts at `'location'`
- Location phase: renders VisualLocationPicker or the existing inside/outside picker. "Next" button advances to reason phase.
- Reason phase: renders reason cards in a 2×2 grid (reuse existing `REASONS` array). "Next" advances to items phase.
- Items phase: existing catalog browser. `selectItem()` adds items directly to `data.selectedItems` with the CO-level location and reason — no per-item modal.
- Back button within StepCatalog navigates between internal phases before going to the previous wizard step.

**canAdvance for catalog step:** requires `data.selectedItems.length > 0` (unchanged) — but the internal phases gate progression within the step.

