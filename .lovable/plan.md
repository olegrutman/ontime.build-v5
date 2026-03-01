
# Unify All Wizard UI to Match Overview Design System

## Current State

There are 6 wizards in the app, each with a different visual structure:

| Wizard | Container | Header Style | Footer Style | Progress |
|--------|-----------|-------------|-------------|----------|
| Work Order | Dialog, `max-w-lg p-0` | WizardProgress bar + step title | `border-t bg-muted/30` footer | Segmented bar |
| RFI | Dialog, `max-w-lg p-0` | Reuses WizardProgress | Same footer pattern | Segmented bar |
| PO (v2) | Dialog/Sheet, `max-w-lg p-0` | Custom inline header per screen | Per-screen sticky footer | Text "Step X of Y" |
| Returns | Dialog, `max-w-2xl max-h-[85vh]` | DialogHeader/DialogTitle | Inline `border-t` buttons | None -- title only |
| Change Order | Sheet (right side) | SheetHeader sticky | Sticky bottom submit bar | None |
| New Project | Full page with sidebar | Card sidebar with step circles | Below-card nav buttons | Sidebar nav |

## Target Design

All wizards should share the same visual DNA:
- Soft white card container on the neutral gray background
- Consistent `WizardProgress` top bar (segmented pill bar + centered title/description)
- Same footer pattern: `border-t bg-muted/30 p-4` with Back/Next buttons
- `rounded-2xl shadow-sm` dialog styling (inherits from updated Card base)
- Same content padding and scroll behavior

## Changes

### 1. Update shared `WizardProgress` component
**File**: `src/components/work-order-wizard/WizardProgress.tsx`

Update styling to match the unified design system:
- Background: remove `bg-muted/30`, use clean white with subtle bottom border
- Step counter: uppercase tracking-wide label (`text-xs uppercase tracking-wide text-muted-foreground font-medium`)
- Progress pills: slightly larger (`h-2`), keep the `rounded-full` and color scheme
- Add consistent vertical padding

### 2. Standardize Returns Wizard
**File**: `src/components/returns/CreateReturnWizard.tsx`

This is the most inconsistent wizard. Changes:
- Replace `DialogHeader`/`DialogTitle` with the shared `WizardProgress` component
- Restructure layout: `p-0 gap-0 overflow-hidden` on DialogContent (like WO wizard)
- Move step content into a scrollable `div` with `px-6 pb-6 pt-4 min-h-[400px] max-h-[60vh] overflow-y-auto`
- Move navigation into a proper sticky footer: `flex items-center justify-between p-4 border-t bg-muted/30`
- Add step descriptions to `stepTitles` array for WizardProgress
- Category grid buttons: update to `rounded-2xl shadow-sm hover:shadow-md transition-shadow` (no border)

### 3. Standardize Change Order Wizard
**File**: `src/components/change-order-wizard/ChangeOrderWizardDialog.tsx`

Currently uses a right-side Sheet with a completely different layout (single scrollable form, no steps). Changes:
- Switch from `Sheet` to `Dialog` with `max-w-lg p-0 gap-0 overflow-hidden`
- Add WizardProgress at the top (treat the existing section cards as logical steps: Location, Work Type, Resources, Assignment, Review -- or keep single-page but add the progress bar header for visual consistency)
- Update the sticky submit footer to use `border-t bg-muted/30 p-4` pattern
- Replace `SectionCard` border styling: change `border rounded-xl` to `rounded-2xl shadow-sm` (no border)
- Keep as single-page scrollable form but wrap with consistent header/footer chrome

### 4. Standardize PO Wizard
**File**: `src/components/po-wizard-v2/HeaderScreen.tsx`, `ReviewScreen.tsx`, `ItemsScreen.tsx`

The PO wizard already has the closest design to the target. Minor tweaks:
- `HeaderScreen`: Update header from `bg-muted/30` to clean white, use uppercase tracking-wide label for step counter
- `ReviewScreen`: Same header update
- Cards within screens already use `rounded-2xl shadow-sm` from Phase 1 card update -- just ensure `bg-muted/30` cards match

### 5. Standardize New Project Wizard
**File**: `src/pages/CreateProjectNew.tsx`

The project wizard is a full-page layout (not a dialog), which is fine for its complexity. Changes:
- Sidebar progress: Update step circles to match WizardProgress color scheme (use `bg-primary/10` for current step background, not just the circle)
- Navigation buttons: Use same `border-t bg-muted/30 p-4` sticky footer instead of floating below the card
- Step content card: inherits `rounded-2xl shadow-sm` from the global Card update
- Sidebar card: same inheritance

### 6. Standardize RFI Wizard
**File**: `src/components/rfi/CreateRFIDialog.tsx`

Already uses WizardProgress and the same dialog pattern as Work Order. Minor tweaks:
- Footer already matches. No major changes needed.

### 7. Standardize Estimate Upload Wizard
**File**: `src/components/estimate-upload/EstimateUploadWizard.tsx`

Uses a basic Dialog with DialogHeader. Changes:
- Add WizardProgress to match other wizards
- Update layout to `p-0 gap-0` pattern
- Move to consistent footer

## Detailed File Changes

### `src/components/work-order-wizard/WizardProgress.tsx`
- Update `bg-muted/30` to `bg-white dark:bg-card`
- Step counter: add `uppercase tracking-wide font-medium`
- Progress bars: `h-2` instead of `h-1.5`

### `src/components/returns/CreateReturnWizard.tsx`
- Import and use `WizardProgress`
- Add steps array with titles and descriptions
- Restructure DialogContent: `max-w-2xl p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col`
- Wrap step content in scrollable div
- Extract footer to sticky bottom bar
- Category grid buttons: replace `border bg-card` with `shadow-sm hover:shadow-md`

### `src/components/change-order-wizard/ChangeOrderWizardDialog.tsx`
- Change from Sheet to Dialog
- Add WizardProgress header with project name subtitle
- Update SectionCard styling to borderless shadow cards
- Standardize footer buttons

### `src/components/po-wizard-v2/HeaderScreen.tsx`
- Header: change `bg-muted/30` to clean white, uppercase tracking-wide step label

### `src/components/po-wizard-v2/ReviewScreen.tsx`
- Same header update as HeaderScreen

### `src/components/po-wizard-v2/ItemsScreen.tsx`
- Same header update (need to check current styling)

### `src/pages/CreateProjectNew.tsx`
- Wrap navigation in `border-t bg-muted/30 p-4` section
- Progress sidebar: update current step highlight to match WizardProgress colors

### `src/components/estimate-upload/EstimateUploadWizard.tsx`
- Replace DialogHeader with WizardProgress
- Update DialogContent to `p-0 gap-0` pattern

## What Does NOT Change
- All wizard business logic, validation, data flow
- Step ordering and content
- Form fields and their behavior
- Submit handlers and API calls
- The PO wizard's mobile Sheet behavior (stays as-is for UX)
