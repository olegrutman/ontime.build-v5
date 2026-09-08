-- 1. Invoice paid notification (money received)
CREATE OR REPLACE FUNCTION public.notify_invoice_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _contract project_contracts;
  _to_org organizations;
BEGIN
  IF NEW.status <> 'PAID' OR OLD.status = 'PAID' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _contract FROM project_contracts WHERE id = NEW.contract_id;
  IF _contract.id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO _to_org FROM organizations WHERE id = _contract.to_org_id;

  INSERT INTO notifications (recipient_org_id, type, title, body, entity_type, entity_id, action_url)
  VALUES (
    _contract.from_org_id,
    'INVOICE_PAID',
    'Payment received: ' || NEW.invoice_number,
    COALESCE(_to_org.name, 'Your client') || ' recorded payment of $' ||
      to_char(ROUND(NEW.total_amount::numeric, 2), 'FM999,999,990.00') ||
      ' on invoice "' || NEW.invoice_number || '"',
    'INVOICE',
    NEW.id,
    '/project/' || NEW.project_id || '?tab=invoices'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_invoice_paid ON public.invoices;
CREATE TRIGGER trg_notify_invoice_paid
AFTER UPDATE OF status ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.notify_invoice_paid();

-- 2. Purchase order approved by the upstream contractor -> tell the org that raised it
CREATE OR REPLACE FUNCTION public.notify_po_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status <> 'PENDING_APPROVAL'
     OR NEW.status NOT IN ('SENT', 'ACTIVE', 'ORDERED', 'SUBMITTED') THEN
    RETURN NEW;
  END IF;

  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (recipient_org_id, type, title, body, entity_type, entity_id, action_url)
  VALUES (
    NEW.organization_id,
    'PO_APPROVED',
    'Purchase order approved: ' || COALESCE(NEW.po_number, ''),
    'Your purchase order "' || COALESCE(NEW.po_name, NEW.po_number, '') || '" was approved and released to the supplier.',
    'PO',
    NEW.id,
    '/purchase-orders/' || NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_po_approved ON public.purchase_orders;
CREATE TRIGGER trg_notify_po_approved
AFTER UPDATE OF status ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_po_approved();

-- 3. Supplier estimate submitted / approved
CREATE OR REPLACE FUNCTION public.notify_supplier_estimate_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _buyer_org uuid;
  _supplier_name text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO _supplier_name FROM organizations WHERE id = NEW.supplier_org_id;

  IF NEW.status = 'SUBMITTED' THEN
    SELECT pp.organization_id INTO _buyer_org
    FROM project_participants pp
    WHERE pp.project_id = NEW.project_id
      AND pp.organization_id <> NEW.supplier_org_id
      AND upper(COALESCE(pp.role, '')) IN ('GC', 'GENERAL CONTRACTOR')
    ORDER BY pp.created_at
    LIMIT 1;

    IF _buyer_org IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO notifications (recipient_org_id, type, title, body, entity_type, entity_id, action_url)
    VALUES (
      _buyer_org,
      'ESTIMATE_SUBMITTED',
      'Estimate submitted: ' || COALESCE(NEW.name, ''),
      COALESCE(_supplier_name, 'A supplier') || ' submitted an estimate of $' ||
        to_char(ROUND(COALESCE(NEW.total_amount, 0)::numeric, 2), 'FM999,999,990.00') || ' for your review.',
      'ESTIMATE',
      NEW.id,
      '/project/' || NEW.project_id || '?tab=estimates'
    );
  ELSIF NEW.status = 'APPROVED' THEN
    INSERT INTO notifications (recipient_org_id, type, title, body, entity_type, entity_id, action_url)
    VALUES (
      NEW.supplier_org_id,
      'ESTIMATE_APPROVED',
      'Estimate approved: ' || COALESCE(NEW.name, ''),
      'Your estimate of $' ||
        to_char(ROUND(COALESCE(NEW.total_amount, 0)::numeric, 2), 'FM999,999,990.00') ||
        ' was approved. You can start fulfilling it.',
      'ESTIMATE',
      NEW.id,
      '/project/' || NEW.project_id || '?tab=estimates'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_supplier_estimate_status ON public.supplier_estimates;
CREATE TRIGGER trg_notify_supplier_estimate_status
AFTER UPDATE OF status ON public.supplier_estimates
FOR EACH ROW EXECUTE FUNCTION public.notify_supplier_estimate_status();

-- 4. Only email the business-critical alert kinds (Tier 1 + Tier 2)
DROP TRIGGER IF EXISTS trg_send_notification_email ON public.notifications;
CREATE TRIGGER trg_send_notification_email
AFTER INSERT ON public.notifications
FOR EACH ROW
WHEN (NEW.type IN (
  'INVOICE_SUBMITTED', 'INVOICE_APPROVED', 'INVOICE_REJECTED', 'INVOICE_PAID',
  'CHANGE_SUBMITTED', 'CHANGE_APPROVED', 'CHANGE_REJECTED',
  'WORK_ORDER_ASSIGNED', 'CO_CLOSED_FOR_PRICING', 'FC_PRICING_SUBMITTED',
  'PO_SENT', 'PO_APPROVED',
  'PROJECT_INVITE', 'WORK_ITEM_INVITE', 'JOIN_REQUEST',
  'ESTIMATE_SUBMITTED', 'ESTIMATE_APPROVED'
))
EXECUTE FUNCTION public.send_notification_email_trigger();

REVOKE ALL ON FUNCTION public.notify_invoice_paid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_po_approved() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_supplier_estimate_status() FROM PUBLIC, anon, authenticated;