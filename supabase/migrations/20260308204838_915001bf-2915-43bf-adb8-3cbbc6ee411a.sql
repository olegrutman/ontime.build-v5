
-- Fix: remove ::text cast causing "operator does not exist: uuid = text"

CREATE OR REPLACE FUNCTION cleanup_invite_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.invite_status = 'accepted' THEN
    DELETE FROM notifications
    WHERE entity_type = 'project_invite'
      AND entity_id = NEW.id
      AND type = 'PROJECT_INVITE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_invoice_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('APPROVED', 'REJECTED', 'PAID') THEN
    DELETE FROM notifications
    WHERE entity_type = 'invoice'
      AND entity_id = NEW.id
      AND type IN ('INVOICE_SUBMITTED', 'INVOICE_APPROVED', 'INVOICE_REJECTED');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_change_order_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('APPROVED', 'REJECTED') THEN
    DELETE FROM notifications
    WHERE entity_type = 'change_order'
      AND entity_id = NEW.id
      AND type IN ('CHANGE_ORDER_SUBMITTED', 'CHANGE_ORDER_APPROVED', 'CHANGE_ORDER_REJECTED');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_po_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('ORDERED', 'DELIVERED', 'CANCELLED') THEN
    DELETE FROM notifications
    WHERE entity_type = 'purchase_order'
      AND entity_id = NEW.id
      AND type IN ('PO_SUBMITTED', 'PO_APPROVED', 'PO_REJECTED');
  END IF;
  RETURN NEW;
END;
$$;
