
## What’s still failing (root cause)

The error is not the `work_order_id` column anymore; it’s now a **foreign key constraint**:

- The app is inserting into `purchase_orders.work_item_id`
- Your database enforces `purchase_orders.work_item_id` → **`work_items.id`**
- But on the Change Order / Work Order page, `changeOrder.id` is an ID from **`change_order_projects`**, not `work_items`
- So the insert fails with:

```json
{
  "code": "23503",
  "details": "Key is not present in table \"work_items\".",
  "message": "violates foreign key constraint \"purchase_orders_work_item_id_fkey\""
}
```

Network request confirms it’s sending:
- `work_item_id: "e70f5c61-f00e-4b0e-8469-dc0a3a23be4e"` (a change order ID)

## The correct fix (minimal + safe)

### Key idea
For Change Orders, **do not set `purchase_orders.work_item_id`** at all.

You already link the PO to the change order using:
- `change_order_projects.linked_po_id` (via `onPOCreated(newPO.id)`)

So `work_item_id` is not needed for the change-order PO workflow, and leaving it null avoids the FK failure while preserving existing PO behavior elsewhere.

## Implementation steps

### 1) Fix PO insert payload in `MaterialResourceToggle.tsx`
**File:** `src/components/change-order-detail/MaterialResourceToggle.tsx`

Change the PO insert so it **does not send `work_item_id`**.

Current (buggy):
```ts
.insert({
  ...
  project_id: data.project_id,
  work_item_id: changeOrder.id,  // this is NOT a work_items id
  ...
})
```

Update to:
- remove `work_item_id` entirely (preferred), OR explicitly set it to `null`

This will allow PO creation to succeed from the work order page.

### 2) (Optional but recommended) Add a “work order linkage” column later
If you want referential integrity (so a PO is formally tied to a change order in the DB), the clean solution is:

- Add `purchase_orders.change_order_id uuid null references change_order_projects(id)`
- Update PO queries/UI to show work order title via that relation when present

This avoids overloading `work_item_id` (which is reserved for the unified `work_items` model).

I will not do this unless you approve a schema change, because it touches DB + downstream queries.

### 3) Add a clearer error message (quality-of-life)
**File:** `src/components/change-order-detail/MaterialResourceToggle.tsx`

When PO creation fails, also surface `error.code` and `error.details` (when present) into the toast so issues like FK/RLS are obvious, not “Unknown error”.

### 4) Quick regression checks
After the change:
1. On `/change-order/:id`, toggle “Materials needed”
2. Click “Add Materials via Product Picker”
3. Complete and submit PO
4. Confirm:
   - PO creates successfully
   - `change_order_projects.linked_po_id` gets set
   - Materials tile populates
   - PO is `SUBMITTED` and visible to supplier workflow

## Why this is the right fix

- It resolves the current crash without breaking existing PO flows that rely on `work_item_id`.
- It matches your architecture: change orders are stored in `change_order_projects` and linked to POs through `linked_po_id`.
- It avoids forcing fake rows into `work_items` (which currently doesn’t even have a `CHANGE_ORDER` type).

## Files involved
- `src/components/change-order-detail/MaterialResourceToggle.tsx` (required)
- (Optional later) a new migration to add `purchase_orders.change_order_id`

