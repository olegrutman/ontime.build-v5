

# Add Backout Scope Gate Question

## Problem
The "Backout & Interior" phase always generates SOV lines without asking the user if backout work is in their scope. Need a Yes/No gate question.

## Changes

### `src/hooks/useSetupWizardV2.ts`

**Add new question** in `TYPE_QUESTIONS` (or `SHARED_QUESTIONS` since backout applies to all building types):
```
Q_backout_gate — "Is backout (return after MEP rough-in) in your scope?"
- phase: 'backout'
- inputType: 'yes_no'
- tag: 'scope_gate'
- fieldKey: 'has_backout'
- buildingTypes: all 6 types
```

**Update `generateSOVLines()`** — wrap the Phase 5 backout lines in a conditional:
- Only generate "MEP backout", "Blocking", "Fire blocking", "Shim & shave" if `has_backout === 'yes'`
- ADA blocking (senior living) also gated behind this

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Add backout scope gate question; conditionally generate backout SOV lines |

