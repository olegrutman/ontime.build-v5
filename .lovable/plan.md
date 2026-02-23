

# Conditional Material Visibility + Better Material Responsibility UI

## Overview
Two changes: (1) hide material-related financial cards and the estimates tab from the party NOT responsible for materials, and (2) redesign the MaterialResponsibilityCard toggle for a friendlier, more polished UI.

## Changes

### 1. MaterialResponsibilityCard -- expose the responsibility value

The card currently fetches the `material_responsibility` value internally. To let `ProjectHome` use this value for conditional rendering, the card will accept an `onResponsibilityChange` callback that fires whenever the value is loaded or updated.

**File: `src/components/project/MaterialResponsibilityCard.tsx`**

- Add prop: `onResponsibilityChange?: (value: string | null) => void`
- Call it on initial fetch and after save
- Redesign the UI:
  - Replace the small inline toggle with two large selectable cards side by side ("General Contractor" vs "Trade Contractor") showing the org name under each, with the selected one highlighted in blue
  - When already set, show a clean display with the selected party highlighted and a subtle "Change" link
  - Use a segmented-control style instead of the current cramped ToggleGroup + Save + Cancel layout

### 2. ProjectHome -- track material responsibility and conditionally hide sections

**File: `src/pages/ProjectHome.tsx`**

- Add state: `const [materialResponsibility, setMaterialResponsibility] = useState<string | null>(null)`
- Pass `onResponsibilityChange={setMaterialResponsibility}` to `MaterialResponsibilityCard`
- Determine current viewer's org type from `userOrgRoles`
- Conditional hiding logic:
  - If `materialResponsibility === 'GC'` and viewer is TC: hide `FinancialSignalBar` material cards and estimates tab
  - If `materialResponsibility === 'TC'` and viewer is GC: hide `FinancialSignalBar` material cards and estimates tab
- For the estimates tab: wrap the render with an additional check so the non-responsible party does not see it

### 3. FinancialSignalBar -- accept a prop to hide material cards

**File: `src/components/project/FinancialSignalBar.tsx`**

- Add prop: `hideMaterialCards?: boolean`
- When `hideMaterialCards` is true:
  - **GC view**: Skip the "Supplier Est. vs Orders" card (lines 286-294)
  - **TC view**: Skip "Material Budget", "Supplier Estimate", and "Material Ordered vs Est." cards (lines 231-261)

### 4. Estimates tab conditional visibility

**File: `src/pages/ProjectHome.tsx`**

In the estimates tab section, add a guard:
- If viewer is GC and `materialResponsibility === 'TC'`, hide the estimates tab content
- If viewer is TC and `materialResponsibility === 'GC'`, hide the estimates tab content
- Show a message like "Materials are managed by the [GC/TC] on this project" if hidden

---

## UI Redesign for MaterialResponsibilityCard

The new card layout:

```text
+----------------------------------------------------------+
| [Package icon]  Who handles materials on this project?   |
|                                                          |
|  +------------------------+  +------------------------+  |
|  |  General Contractor    |  |  Trade Contractor      |  |
|  |  Acme Builders         |  |  Smith Framing         |  |
|  +------------------------+  +------------------------+  |
|              ^selected (blue border + bg)                 |
+----------------------------------------------------------+
```

- Two side-by-side selectable cards with org names
- Clicking one immediately saves (no Save/Cancel buttons needed)
- Selected card gets a blue border and light blue background
- Saving shows a brief spinner on the selected card
- Non-editable users see the same layout but cards are not clickable

## Files Changed

| File | Change |
|------|--------|
| `src/components/project/MaterialResponsibilityCard.tsx` | Redesign UI, add callback prop |
| `src/pages/ProjectHome.tsx` | Track responsibility, conditionally hide sections |
| `src/components/project/FinancialSignalBar.tsx` | Add `hideMaterialCards` prop |

