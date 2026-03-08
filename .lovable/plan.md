
# Fix: "operator does not exist: uuid = text" on Invoice Approve

## Root Cause
When the GC approves (or rejects) an invoice, the `trg_cleanup_invoice_notification` trigger fires. Inside `cleanup_invoice_notification()`, line 28 does:
```sql
AND entity_id = NEW.id::text
```
The `entity_id` column is `uuid`, but `NEW.id::text` is `text`. Postgres has no `uuid = text` operator, so it throws the error. This blocks the entire UPDATE (approve/reject) from completing.

The same bug exists in all four cleanup triggers created in migration `20260308170027`:
1. `cleanup_invite_notification` — line 9
2. `cleanup_invoice_notification` — line 28
3. `cleanup_change_order_notification` — line 47
4. `cleanup_po_notification` — line 65

## Fix
One new migration that recreates all four functions, removing the `::text` cast:
```sql
entity_id = NEW.id    -- was: NEW.id::text
```

## Files Changed
- 1 new migration file (SQL only, no frontend changes needed)
