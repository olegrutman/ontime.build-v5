

# Bug: Supplier Cannot Update PO Status or Save Pricing

## What's Happening (Plain English)

Every time the supplier (or anyone) tries to update a Purchase Order -- whether saving pricing, marking it as ordered, or changing any status -- the update fails with the error:

> "invalid input value for enum notification_type: PO_SUBMITTED"

The database has a cleanup trigger (`cleanup_po_notification`) that fires on **every** PO update. This trigger tries to delete old notifications where the type is `'PO_SUBMITTED'`, `'PO_APPROVED'`, or `'PO_REJECTED'`. But these notification types were **never added** to the database's allowed list of notification types. The system only has `'PO_SENT'` as a valid PO-related notification type. So Postgres rejects the entire update because it can't match against values that don't exist in the enum.

In short: a cleanup trigger introduced in a recent migration references notification types that don't exist, which blocks **all** PO updates for **all** users.

## Fix

One database migration to fix the `cleanup_po_notification` function so it only references the notification type that actually exists (`PO_SENT`), or alternatively add the missing enum values.

The simplest and safest fix is to update the function to use `PO_SENT` instead of the non-existent values:

```sql
CREATE OR REPLACE FUNCTION public.cleanup_po_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('ORDERED', 'DELIVERED') THEN
    DELETE FROM notifications
    WHERE entity_type = 'purchase_order'
      AND entity_id = NEW.id
      AND type = 'PO_SENT';
  END IF;
  RETURN NEW;
END;
$function$;
```

Also removes `'CANCELLED'` from the status check since `CANCELLED` is not a valid PO status in the system.

### Files Changed

| File | Change |
|---|---|
| Database migration (new) | Fix `cleanup_po_notification` function to reference valid enum values only |

