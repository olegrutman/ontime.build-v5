

# Remove SOV Floor Grouping — Show Flat List

## Problem
The SOV editor groups line items into collapsible sections by `floor_label` (Basement, Floor 1, Roof, Exterior, etc.). The user wants all items shown as a simple flat numbered list without any grouping.

Additionally, the "Generate SOV (AI-powered)" and "Regenerate with AI" buttons should be removed — the SOVs created during project setup should be used as-is.

## Changes

### 1. Remove floor grouping from SOV display
In `ContractSOVEditor.tsx`, remove the floor-label grouping logic (lines 756-834) and always render the flat list path. This means every item renders sequentially with its number, name, percentage, and dollar amount — no collapsible floor sections.

### 2. Remove AI generate buttons
- Remove the "Generate SOV (AI-powered)" button from the empty-SOV state (line 233-239)
- Remove the "Regenerate with AI" button (refresh icon) from each SOV card header (lines 548-570)
- Keep the "Create SOV" and "Upload SOV" options since those use template/manual methods

### Files Changed

| File | Change |
|------|--------|
| `src/components/sov/ContractSOVEditor.tsx` | Remove floor grouping logic, always render flat list; remove AI generate/regenerate buttons |

