

# Fix Outside Location: Next Button and Unit ID for Apartments

## Bug 1: "Next" Button Not Working

**Root cause:** In `WorkOrderWizard.tsx` line 79, `canGoNext()` checks for the old field `exterior_feature` which is never populated by the new stepped flow. It should check `exterior_level` instead.

### Fix in `src/components/work-order-wizard/WorkOrderWizard.tsx`
- Change line 79 from `formData.location_data.exterior_feature` to `formData.location_data.exterior_level`

## Bug 2: Unit ID Not Appearing for Apartments

**Root cause:** The current check is `(projectScope?.num_units ?? 0) > 1 || (projectScope?.num_buildings ?? 0) > 1`. For this apartment project, `num_units` is `null` and `num_buildings` is `1`, so it evaluates to `false`.

Apartments are inherently multifamily even if `num_units` wasn't explicitly set during project creation.

### Fix in `src/components/work-order-wizard/steps/LocationStep.tsx`
- Expand the `isMultiFamily` check to also consider `home_type`. If the home type contains keywords like "apartment", "condo", "townhouse", "multi", or "duplex", treat it as multifamily regardless of the unit count fields.

```
const isMultiFamily =
  (projectScope?.num_units ?? 0) > 1 ||
  (projectScope?.num_buildings ?? 0) > 1 ||
  /apartment|condo|townhouse|multi|duplex|triplex/i.test(projectScope?.home_type ?? '');
```

## Summary
Two small fixes, both in existing files. No new files or type changes needed.

