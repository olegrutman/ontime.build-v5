## Plan

Fix the re-run setup wizard so building type is only collected once.

### What I’ll change
- Treat the first “Confirm Building Info” screen as the source of truth for building type.
- Remove/skips the later standalone “Building Type” step from the re-run setup flow.
- When continuing from “Confirm Building Info,” sync that selected building type into the SOV wizard state so the Scope step can generate the correct SOV.
- Keep T&M behavior unchanged, since it already does not use the fixed-price building type/SOV steps.

### Technical notes
- Update `src/pages/FinishProjectSetup.tsx` only.
- Change the fixed setup step list from:
  `building_info → mode → invite_team → contracts → building_type → scope → review`
  to:
  `building_info → mode → invite_team → contracts → scope → review`
- Ensure `wizard.selectBuildingType(tmScope.buildingType)` is called before the Scope step needs `wizard.buildingType`.