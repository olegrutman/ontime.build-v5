
# Fix: PO Creation Using Wrong Column Name

## Problem

When creating a PO from the work order page, the code fails with:

```
"Could not find the 'work_order_id' column of 'purchase_orders' in the schema cache"
```

## Root Cause

The `purchase_orders` table has a column named `work_item_id`, but the code in `MaterialResourceToggle.tsx` is trying to insert into a column called `work_order_id`.

**In the database schema:**
- Column exists: `work_item_id`
- Column used in code: `work_order_id` (does not exist)

## Fix

Update `MaterialResourceToggle.tsx` to use the correct column name `work_item_id` instead of `work_order_id`.

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/change-order-detail/MaterialResourceToggle.tsx` | Change `work_order_id` to `work_item_id` in the PO insert statement (line 113) |

---

## Code Change

**File: `src/components/change-order-detail/MaterialResourceToggle.tsx`**

Line 113, change:
```typescript
work_order_id: changeOrder.id,
```

To:
```typescript
work_item_id: changeOrder.id,
```

---

## Additional Notes

This is a simple typo fix. The `purchase_orders` table already has the `work_item_id` column with a foreign key to `change_order_projects` (or work items), so no database migration is needed - just the code fix.
