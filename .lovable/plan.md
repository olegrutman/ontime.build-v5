

# Simplify Materials & Equipment Step

## Problem
After choosing "General Contractor" as the responsible party, a confusing follow-up question appears: "Add extra materials to this work order?" / "Add equipment to this work order?". This doesn't make sense -- the step should just be about assigning who pays for and sees the cost of materials/equipment, nothing more.

## Solution
Remove the "Yes/No" follow-up questions entirely. The step becomes purely about cost responsibility: pick who pays (TC or GC) for materials, and who pays for equipment. That's it.

## Changes in `src/components/work-order-wizard/steps/ResourcesStep.tsx`

- Remove the `YesNoButton` component (no longer needed)
- Remove the `showMaterialsQuestion` / `showEquipmentQuestion` logic
- Remove the conditional "Add extra materials/equipment?" blocks
- Simplify the handlers: selecting a responsibility just sets `material_cost_responsibility` or `equipment_cost_responsibility` without toggling `requires_materials` / `requires_equipment`
- Update the subtitle text to: "Assign who is responsible for paying material and equipment costs"

## Result
The step becomes a clean two-section layout:
1. **Materials** -- Trade Contractor or General Contractor
2. **Equipment** -- Trade Contractor or General Contractor

No confusing follow-up questions.

