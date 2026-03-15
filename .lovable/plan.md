

# PO Wizard — Nested Dialog Problem & Fix

## The Problem

The PO Wizard has a **dialog-inside-dialog** architecture that other wizards in the app do not use:

1. **`POWizardV2`** renders as a `Dialog` (desktop) or `Sheet` (mobile)
2. **`ProductPicker`** renders as a *second* `Dialog`/`Sheet` on top of the first
3. **`UnmatchedItemEditor`** renders as a *third* `Dialog`/`Sheet` on top

This creates overlapping backdrops/shadows, broken back-button behavior, and a visually jarring stacking effect. By contrast, `WorkOrderWizard` and `ChangeOrderWizardDialog` use a **single Dialog** with internal step switching — no nesting.

## The Fix

Collapse the three-layer dialog stack into a **single Dialog/Sheet** with unified internal screen routing. The ProductPicker and UnmatchedItemEditor become inline screen content rather than separate modals.

### Architecture Change

```text
BEFORE (3 layers):
┌─ Dialog: POWizardV2 ─────────────┐
│  header │ items │ review          │
│  ┌─ Dialog: ProductPicker ──────┐ │
│  │  source│cat│filter│products  │ │
│  │  ┌─ Dialog: UnmatchedEditor ┐│ │
│  │  └─────────────────────────┘│ │
│  └─────────────────────────────┘ │
└──────────────────────────────────┘

AFTER (1 layer):
┌─ Dialog: POWizardV2 ─────────────┐
│  screen = header | items | review │
│         | picker-source | ...     │
│         | picker-quantity         │
│         | unmatched-editor        │
└──────────────────────────────────┘
```

### Detailed Changes

#### 1. `POWizardV2.tsx` — Merge all screens into one component

- Expand the `Screen` type to include all picker and editor states:
  ```typescript
  type Screen = 'header' | 'items' | 'review'
    | 'picker-source' | 'picker-estimate' | 'picker-category'
    | 'picker-secondary' | 'picker-filter' | 'picker-products'
    | 'picker-quantity' | 'unmatched-editor';
  ```
- Move all state from `ProductPicker` (categories, filters, selected product, etc.) into `POWizardV2`
- Move `UnmatchedItemEditor` state (quantity, notes) into `POWizardV2`
- Render all screens inline inside the single Dialog/Sheet based on `screen` value
- Remove the nested `<ProductPicker>` and `<UnmatchedItemEditor>` component renders
- Keep the existing trail chips and progress bar — extend progress values for picker screens (e.g. all picker screens show 50% since they're part of the "items" phase)
- Back button logic: unified `handleBack` that navigates through all screens correctly

#### 2. `ProductPicker.tsx` — Convert to a non-modal component

- Remove the `Dialog`/`Sheet` wrapper entirely
- Export the inner content as a set of render functions or a single component that takes `screen` as a prop and renders the appropriate step
- Alternatively, inline all the picker logic directly into `POWizardV2.tsx` (since it's already tightly coupled)

Best approach: **Extract the picker logic into a custom hook** (`useProductPicker`) that returns state + handlers, and render the picker UI directly in `POWizardV2.tsx`. This keeps the file manageable.

#### 3. `UnmatchedItemEditor.tsx` — Convert to inline panel

- Remove the `Dialog`/`Sheet` wrapper
- Export just the form content as a simple component (`UnmatchedItemPanel`)
- Rendered when `screen === 'unmatched-editor'` inside the main wizard

#### 4. Back button behavior

The unified `handleBack` in `POWizardV2` will handle all transitions:
- `picker-quantity` → `picker-products`
- `picker-products` → `picker-filter`
- `picker-filter` → delegates to `StepByStepFilter.goBack()`, or `picker-secondary`/`picker-category`
- `picker-category` → `picker-source` (if estimates exist) or `items`
- `picker-source` → `items`
- `unmatched-editor` → `items`
- `items` → `header`
- `review` → `items`

### Files to Modify

| File | Change |
|---|---|
| `src/components/po-wizard-v2/POWizardV2.tsx` | Merge all screen routing; absorb picker + editor state; single Dialog |
| `src/components/po-wizard-v2/ProductPicker.tsx` | Remove Dialog/Sheet wrapper; export as hook + content components |
| `src/components/po-wizard-v2/UnmatchedItemEditor.tsx` | Remove Dialog/Sheet wrapper; export as inline panel |

### What Does NOT Change
- All sub-components (`CategoryGrid`, `SecondaryCategoryList`, `StepByStepFilter`, `ProductList`, `QuantityPanel`, `EstimateSubTabs`, `PackSelector`, `PSMBrowser`) remain untouched
- `HeaderScreen`, `ItemsScreen`, `ReviewScreen` remain untouched
- No routing, data flow, or submission logic changes
- Trail chips and progress bar styling unchanged

