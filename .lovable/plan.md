

# Fix: Back Button on Items Screen After Pack Selection

## Problem
When a user selects a pack from an estimate, they land on the Items screen with the pack loaded. Pressing **Back** takes them to the Header (step 1) — skipping over the pack list entirely. The "Change" button exists but is easy to miss and its purpose is unclear.

## Fix

**Make the Back button context-aware on the Items screen:**

- **If a pack is loaded** (`sourcePackName` is set): Back clears the pack items and navigates to the picker's estimate step (the pack list), so the user can pick a different pack.
- **If no pack is loaded** (manual catalog items or empty): Back goes to the Header as it does today.

### Changes

**`POWizardV2.tsx`**
- Add a new handler `handleBackFromItems` that checks `formData.source_pack_name`:
  - If set: call `handleClearPack()`, then `setScreen('picker')` — and set a flag so the picker opens on the `estimate` step instead of `source`.
- Pass this handler as `onBack` to `ItemsScreen` instead of the current `() => setScreen('header')`.

**`ProductPicker.tsx`**
- Accept an optional `initialStep` prop (e.g. `'estimate'`) so when the wizard navigates back to the picker after clearing a pack, it lands directly on the pack list rather than the source selection screen.

**`ItemsScreen.tsx`**
- No changes needed — it already calls `onBack`, the parent just needs to change what that does.

### Files Modified
| File | Change |
|---|---|
| `src/components/po-wizard-v2/POWizardV2.tsx` | Context-aware back handler; pass `initialStep` to picker |
| `src/components/po-wizard-v2/ProductPicker.tsx` | Accept `initialStep` prop to open on estimate step |

