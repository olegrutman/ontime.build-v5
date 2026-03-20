

# Fix: Allow GC to Add Scope Items to a CO

## Problem

Two issues prevent GC from adding tasks to a live CO:

1. **`canAddLabor` excludes GC** — line 320 of `CODetailPage.tsx` has `(isTC || isFC)`, so GC can never interact with line items
2. **No "Add line item" UI on the detail page** — scope items can only be added during initial creation in the wizard. There's no button to add new scope items after a CO is created.

## Fix

### 1. Add "Add scope item" button to the detail page

**File: `CODetailPage.tsx`** — In the "Scope & labor" section header (line 294), add an "Add item" button visible when:
- `canEdit` is true (CO is in an active status)
- User is GC, TC, or FC (all roles can add scope per the spec)
- NTE is not blocked

Clicking the button opens an inline form or a small dialog to pick from the work order catalog (reuse `StepCatalog` pattern) or type a custom item name. The new item is inserted into `co_line_items`.

### 2. Fix `canAddLabor` to include GC for labor logging

**File: `CODetailPage.tsx`** — Change line 320 from:
```
canAddLabor={canEdit && (isTC || isFC) && !nteBlocked}
```
to:
```
canAddLabor={canEdit && !nteBlocked}
```

This allows GC to log hours/pricing on line items they added, which aligns with "GC can add new line items or update scope at any time."

**However** — per the spec, GC doesn't typically log labor (TC and FC do the pricing). If GC should only add scope items but NOT log hours, then `canAddLabor` stays as-is and we only add the "Add scope item" button for GC.

### 3. Send notification on scope addition

**File: `CODetailPage.tsx`** or the new add-item handler — after inserting a new `co_line_item`, call `notifyAllCOParties` with a new notification type (e.g., `CO_SCOPE_UPDATED`) to alert TC and FC.

### Files changed
| File | Change |
|------|--------|
| `CODetailPage.tsx` | Add "Add item" button in scope section header; include GC in the `canAddItem` condition; fire notification on add |
| `coNotifications.ts` | Add `CO_SCOPE_UPDATED` message template (if not already present) |

### No database changes needed
The `co_line_items` INSERT RLS already uses `user_in_org(auth.uid(), org_id)` which works for GC inserting with their org_id.

