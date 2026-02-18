

# Convert RFI to Work Order

## Overview

Add a "Convert to Work Order" button on the RFI detail sheet. When clicked, it opens the existing Work Order Wizard pre-filled with data from the RFI -- the subject becomes the title, the question + answer become the description, and location data carries over.

## Changes

### 1. `src/components/rfi/RFIDetailDialog.tsx`

- Add a "Convert to Work Order" button (visible when RFI status is ANSWERED or CLOSED, and the user has create permissions)
- When clicked, call a new `onConvertToWorkOrder` callback prop with the RFI data
- Button placed after the Close RFI section with a Separator, using a `ClipboardList` icon to match the Work Orders icon

### 2. `src/components/rfi/RFIsTab.tsx`

- Import `WorkOrderWizard` from the work order wizard components
- Add state for `woWizardOpen` and `woInitialData` (pre-filled `WorkOrderWizardData`)
- Add a handler `handleConvertToWO` that:
  - Builds `WorkOrderWizardData` from the selected RFI (title = RFI subject, location_data from RFI, description = "RFI-{number}: {question}\n\nAnswer: {answer}")
  - Opens the Work Order Wizard with that pre-filled data
- Pass `onConvertToWorkOrder` callback to `RFIDetailDialog`
- Wire `WorkOrderWizard` `onComplete` to the existing `useChangeOrderProject` hook's create mutation (same pattern used in `WorkOrdersTab`)

### 3. `src/components/work-order-wizard/WorkOrderWizard.tsx`

- Add an optional `initialData` prop (`Partial<WorkOrderWizardData>`) so the wizard can be pre-filled
- Merge `initialData` with `INITIAL_WIZARD_DATA` in the initial `useState` call
- No other changes to wizard behavior

## Pre-Fill Mapping

| RFI Field | Work Order Field |
|---|---|
| `subject` | `title` |
| `location_data` | `location_data` (direct copy) |
| `question` + `answer` | `description` (formatted as "RFI-N: question\n\nAnswer: answer") |

## User Flow

1. User opens an answered/closed RFI from the detail sheet
2. Clicks "Convert to Work Order" button at the bottom
3. Work Order Wizard opens, pre-filled with RFI data on the Title step (user can see the title is already set)
4. User proceeds through remaining wizard steps (location already filled, can adjust)
5. On Review step, the description is pre-populated from the RFI content
6. User submits -- a new work order is created with the RFI context baked in

## Visibility Rules

- Button visible only when RFI status is `ANSWERED` or `CLOSED` (the question has been resolved, so action can be taken)
- Only users with work order creation permissions see the button (GC_PM, TC_PM roles)

