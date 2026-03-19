

## Support multiple locations on a Change Order

**Problem**: A change order can affect several locations (e.g. water damage in Kitchen Floor 2 AND Bathroom Floor 3), but the wizard only captures one.

### Approach

Keep the existing `location_tag` DB column (text). Store multiple locations joined by `" | "` delimiter. The wizard lets users build a location, add it to a list, then build another.

### Changes

**`src/components/change-orders/wizard/COWizard.tsx`**
- Change `locationTag: string` → `locationTags: string[]` in `COWizardData` and `INITIAL_DATA`
- Update `canAdvance` for location step: `data.locationTags.length > 0`
- On submit, join tags: `location_tag: data.locationTags.join(' | ') || null`

**`src/components/change-orders/wizard/StepLocation.tsx`**
- Switch from editing `data.locationTag` to managing `data.locationTags` array
- Add internal state for the "current location being built" (the existing structured fields)
- Add an "Add Location" button that appends the built tag to `data.locationTags` and resets the form
- Show the list of added locations as removable chips/cards below the form
- Each chip shows the tag string with an X button to remove it

**`src/components/change-orders/wizard/StepConfig.tsx`**
- Update the location preview from `data.locationTag` to `data.locationTags` (show as list)

**`src/components/change-orders/CODetailPage.tsx`**
- Split `co.location_tag` on `" | "` and render each as a separate badge/line instead of a single string

**`src/components/change-orders/COListPage.tsx`**
- Split on `" | "` and show first location + "+N more" if multiple

### Files to change
- `src/components/change-orders/wizard/COWizard.tsx`
- `src/components/change-orders/wizard/StepLocation.tsx`
- `src/components/change-orders/wizard/StepConfig.tsx`
- `src/components/change-orders/CODetailPage.tsx`
- `src/components/change-orders/COListPage.tsx`

