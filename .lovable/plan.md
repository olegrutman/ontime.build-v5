

# Auto-Remove Notifications When Action Is Completed

## Problem
Notifications stay in the list forever even after the user has acted on them. For example, a "New Project Invitation" notification remains visible after the invite has been accepted or declined. Same for PO, invoice, and change order notifications — they linger after approval/rejection.

## Approach
Add database triggers that **DELETE the original notification** when the underlying entity changes to a resolved state. This is the cleanest approach — no UI changes needed since the notification simply disappears from the query results.

## Database Migration

Create a single trigger function that cleans up notifications when actions are completed:

### 1. Project Invite accepted/declined → delete the INVITE notification
When `project_participants.invite_status` changes from `INVITED` to `ACCEPTED` or `DECLINED`, delete the `PROJECT_INVITE` notification where `entity_id = participant.id`.

### 2. Invoice approved/rejected → delete the SUBMITTED notification  
When `invoices.status` changes to `APPROVED` or `REJECTED`, delete the `INVOICE_SUBMITTED` notification for that entity.

### 3. Change Order approved/rejected → delete the SUBMITTED notification
When `change_order_projects.status` changes to `approved` or `rejected`, delete the `CHANGE_SUBMITTED` notification for that entity.

### 4. PO acknowledged → delete the SENT notification
When a PO status moves past `SENT`, delete the `PO_SENT` notification.

## SQL Implementation

```sql
-- 1. Clean up project invite notifications
CREATE OR REPLACE FUNCTION public.cleanup_invite_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.invite_status IN ('ACCEPTED', 'DECLINED')) 
     AND OLD.invite_status = 'INVITED' THEN
    DELETE FROM notifications 
    WHERE entity_type = 'project_participant' 
      AND entity_id = NEW.id 
      AND type = 'PROJECT_INVITE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_invite_notification
  AFTER UPDATE ON public.project_participants
  FOR EACH ROW EXECUTE FUNCTION cleanup_invite_notification();

-- 2. Clean up invoice notifications
CREATE OR REPLACE FUNCTION public.cleanup_invoice_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('APPROVED', 'REJECTED') 
     AND OLD.status = 'SUBMITTED' THEN
    DELETE FROM notifications 
    WHERE entity_type = 'invoice' 
      AND entity_id = NEW.id 
      AND type = 'INVOICE_SUBMITTED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_invoice_notification
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION cleanup_invoice_notification();

-- 3. Clean up change order notifications
CREATE OR REPLACE FUNCTION public.cleanup_change_order_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') 
     AND OLD.status = 'ready_for_approval' THEN
    DELETE FROM notifications 
    WHERE entity_type = 'change_order' 
      AND entity_id = NEW.id 
      AND type = 'CHANGE_SUBMITTED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_change_notification
  AFTER UPDATE ON public.change_order_projects
  FOR EACH ROW EXECUTE FUNCTION cleanup_change_order_notification();

-- 4. Clean up PO notifications
CREATE OR REPLACE FUNCTION public.cleanup_po_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status != 'SENT' AND OLD.status = 'SENT' THEN
    DELETE FROM notifications 
    WHERE entity_type = 'purchase_order' 
      AND entity_id = NEW.id 
      AND type = 'PO_SENT';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_po_notification
  AFTER UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION cleanup_po_notification();
```

## Frontend Changes
**useNotifications.ts** — Update the realtime subscription to also listen for `DELETE` events (currently only `INSERT`). When a notification is deleted from the DB, refetch so it disappears from the UI immediately.

Change the realtime channel event from `'INSERT'` to `'*'` (already listens to `INSERT`, now also catches `DELETE`).

## Files to Edit
- **New migration SQL** — 4 trigger functions + 4 triggers
- `src/hooks/useNotifications.ts` — change realtime event from `INSERT` to `*`

