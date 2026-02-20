

# Add Optional Unit Field for Multifamily Projects (Outside Location)

## What Changes
When a project is multifamily (has `num_units` or `num_buildings` set in the project scope), show an optional "Unit ID" input field in the **Outside** location flow -- the same way it already exists for Inside locations.

## File: `src/components/work-order-wizard/steps/LocationStep.tsx`

- Derive a boolean `isMultiFamily` from `projectScope` by checking if `num_units > 1` or `num_buildings > 1`
- In the Outside section, after the Floor/Level select and before the Feature select, add an optional Unit ID input (same style as the Inside unit field) -- only shown when `isMultiFamily` is true
- The field reuses the existing `data.location_data.unit` property (same field used by Inside), so no type changes needed
- The unit value will also appear in the location summary breadcrumb when filled in

No changes needed to types or other files since the `unit` field already exists on `WorkOrderLocationData`.

