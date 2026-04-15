

# Fix: Platform Owner — See and Delete Work Orders

## Problem
The platform project detail page has a legacy "Change Orders" card (line 682) that renders from `workOrders` state, which is always set to `[]` (line 276). Work orders are stored in the `change_orders` table and already fetched into the `changeOrders` array — but the display table doesn't show the `title` column, making WOs hard to identify.

## Changes — Single file: `src/pages/platform/PlatformProjectDetail.tsx`

### 1. Remove the dead legacy section
Delete the first "Change Orders" card (lines 682-734) that renders `workOrders` (always empty). Also remove the `workOrders` state, `WorkOrderRow` interface, `deleteWOOpen`/`deleteWOTarget` state, and the corresponding delete dialog (lines 975-995) — all dead code.

### 2. Enhance the existing Change Orders table
Update the second CO table (line 736) to show `title` alongside `co_number`, so WOs are identifiable. Add the `title` field to the `CORow` interface and include it in the fetch query.

Updated table columns:
- **CO #** — `co_number`
- **Title** — `co.title` (new column)
- **Status** — badge
- **Pricing Type** — badge
- **Created** — date
- **Delete** — trash icon (PLATFORM_OWNER only, already works)

### 3. Delete action already works
The delete button on the CO table already calls `DELETE_CHANGE_ORDER` with `co_id`, which the edge function handles correctly — it deletes from `change_orders` and cascades all child data. No backend changes needed.

## Summary
Remove dead code, add `title` to the CO table display. No new backend work required.
