

# Fix StepCatalog crash in TMWOWizard

## Root cause
`StepCatalog` receives `reason: 'demolition'` (a work type, not a valid `COReasonCode`). When it renders the reason pill, `CO_REASON_COLORS['demolition']` is `undefined`, so `.bg` crashes.

Additionally, `locationTag` is set to `'TBD'` which makes StepCatalog skip its own location/reason phases and jump to the items browser — but in the TMWOWizard, location and reason are handled by separate steps, so StepCatalog should ONLY show the catalog browser (items phase).

## Fix

### `src/components/change-orders/wizard/TMWOWizard.tsx`
- Change the `catalogData` adapter to use a valid reason code: `reason: 'other' as COReasonCode` (the work type is stored elsewhere; reason is just needed to satisfy the interface)
- This ensures `CO_REASON_COLORS['other']` resolves correctly

### `src/components/change-orders/wizard/StepCatalog.tsx`
- Add a safety guard on the reason pill rendering: if `CO_REASON_COLORS[data.reason]` is undefined, fall back to `CO_REASON_COLORS.other` or skip the pill entirely
- This prevents any future crash if an unexpected reason value is passed

## What stays the same
- All other wizard steps (Work Type, Location, Resources, Review) — unchanged
- The catalog drill-down behavior — unchanged
- Database submission — unchanged

