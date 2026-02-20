

# Unify Work Order Creation: Replace Legacy Wizard

## Problem

There are **two different work order creation components**:

1. **`WorkOrderWizard`** (8-step wizard with Scope Details) -- used on the **Project Home > Work Orders tab**
2. **`ChangeOrderWizardDialog`** (old single-page Sheet form, no steps) -- used on the **/change-orders page** (sidebar navigation)

When a user creates a work order from the `/change-orders` page, they get the old form without the Scope Details dropdowns, progress steps, or AI description generation. This is the "7 steps" (actually 0 steps -- a flat form) the user was seeing.

## Solution

Replace the `ChangeOrderWizardDialog` usage on the `/change-orders` page with the `WorkOrderWizard` component, so **all work order creation flows use the same 8-step wizard**.

## Changes

### 1. Update `/change-orders` page (`src/pages/ChangeOrders.tsx`)

- Replace import of `ChangeOrderWizardDialog` with `WorkOrderWizard`
- Swap the component in the render (line ~351), passing the same props
- The `WorkOrderWizard` already accepts `projectId`, `projectName`, `onComplete`, and `isSubmitting` -- same interface

### 2. No other files need changes

The `WorkOrderWizard` already handles both GC and TC roles internally (it checks `currentRole` via `useAuth`), so the swap is straightforward.

### 3. Optional cleanup (deferred)

The old `ChangeOrderWizardDialog` component and its supporting code could eventually be removed, but that can happen later to keep this change small and safe.

