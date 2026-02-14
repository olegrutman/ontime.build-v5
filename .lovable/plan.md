

# Fix Back Navigation After Pack Selection

## Problem

When a user is on the Items screen (Step 2) in estimate mode and selects a pack, the pack items are loaded into the line items list. At that point, the estimate browser (packs/materials tabs) disappears because `showEstimateBrowser` is `false` when `items.length > 0`. The footer "Back" button navigates to the Header screen (Step 1) instead of returning to the pack selection view.

Users expect the back button to return them to the packs page so they can select a different pack or switch to catalog mode.

## Solution

Add a "Change Pack" or back-to-packs action on the Items screen when items were loaded from an estimate pack. This gives users a clear path back to the pack selection without losing context.

### Changes to `src/components/po-wizard-v2/ItemsScreen.tsx`

1. Accept a new `sourcePackName` prop (already available in `formData.source_pack_name` in the parent) to know whether items came from a pack.
2. Accept a new `onClearItems` callback so the user can clear current pack items and return to pack selection.
3. When items are loaded from a pack, show a small banner above the item list displaying the pack name with a "Change Pack" button. Tapping it clears items and returns to the estimate browser view.

### Changes to `src/components/po-wizard-v2/POWizardV2.tsx`

1. Pass `sourcePackName={formData.source_pack_name}` and an `onClearPack` handler to `ItemsScreen`.
2. The `onClearPack` handler clears `line_items`, `source_estimate_id`, `source_pack_name`, and `pack_modified` so the estimate browser reappears.

## Technical Details

**ItemsScreen.tsx**
- New props: `sourcePackName: string | null`, `onClearPack: () => void`
- When `sourcePackName` is set and `items.length > 0`, render a small info row: `Pack: "{packName}"` with a "Change" button
- "Change" button calls `onClearPack()` which resets items, causing `showEstimateBrowser` to become `true` again

**POWizardV2.tsx**
- Add `handleClearPack` callback that resets `line_items: []`, `source_estimate_id: null`, `source_pack_name: null`, `pack_modified: false`
- Pass `sourcePackName={formData.source_pack_name}` and `onClearPack={handleClearPack}` to `ItemsScreen`

## What Is NOT Changed

- ProductPicker (full catalog) behavior unchanged
- Pack loading logic unchanged
- PSM browser unchanged
- No database changes

