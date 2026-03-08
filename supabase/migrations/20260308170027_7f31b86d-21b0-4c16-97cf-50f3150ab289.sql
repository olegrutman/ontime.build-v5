-- 1. Clean up project invite notifications
CREATE OR REPLACE FUNCTION public.cleanup_invite_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.invite_status IN ('ACCEPTED', 'DECLINED')) 
     AND OLD.invite_status = 'INVITED' THEN
    DELETE FROM notifications 
    WHERE entity_type = 'project_participant' 
      AND entity_id = NEW.id::text 
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
      AND entity_id = NEW.id::text 
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
      AND entity_id = NEW.id::text 
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
      AND entity_id = NEW.id::text 
      AND type = 'PO_SENT';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_po_notification
  AFTER UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION cleanup_po_notification();