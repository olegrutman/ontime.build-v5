CREATE OR REPLACE FUNCTION public.notify_invoice_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _contract project_contracts;
  _from_org organizations;
  _to_org organizations;
BEGIN
  SELECT * INTO _contract FROM project_contracts WHERE id = NEW.contract_id;
  IF _contract.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _from_org FROM organizations WHERE id = _contract.from_org_id;
  SELECT * INTO _to_org FROM organizations WHERE id = _contract.to_org_id;

  IF NEW.status = 'SUBMITTED' AND (OLD.status IS NULL OR OLD.status != 'SUBMITTED') THEN
    BEGIN
      INSERT INTO notifications (
        recipient_org_id, type, title, body, entity_type, entity_id, action_url
      ) VALUES (
        _contract.to_org_id,
        'INVOICE_SUBMITTED',
        'Invoice Received: ' || NEW.invoice_number,
        COALESCE(_from_org.name, 'A contractor') || ' has submitted invoice "' || NEW.invoice_number || '" for $' || ROUND(NEW.total_amount::numeric, 2)::text,
        'INVOICE',
        NEW.id,
        '/project/' || NEW.project_id || '?tab=invoices'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Invoice submission alert failed for invoice %: %', NEW.id, SQLERRM;
    END;
  END IF;

  IF NEW.status = 'APPROVED' AND OLD.status = 'SUBMITTED' THEN
    BEGIN
      INSERT INTO notifications (
        recipient_org_id, type, title, body, entity_type, entity_id, action_url
      ) VALUES (
        _contract.from_org_id,
        'INVOICE_APPROVED',
        'Invoice Approved: ' || NEW.invoice_number,
        COALESCE(_to_org.name, 'Your client') || ' has approved your invoice "' || NEW.invoice_number || '" for $' || ROUND(NEW.total_amount::numeric, 2)::text,
        'INVOICE',
        NEW.id,
        '/project/' || NEW.project_id || '?tab=invoices'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Invoice approval alert failed for invoice %: %', NEW.id, SQLERRM;
    END;
  END IF;

  IF NEW.status = 'REJECTED' AND OLD.status = 'SUBMITTED' THEN
    BEGIN
      INSERT INTO notifications (
        recipient_org_id, type, title, body, entity_type, entity_id, action_url
      ) VALUES (
        _contract.from_org_id,
        'INVOICE_REJECTED',
        'Invoice Rejected: ' || NEW.invoice_number,
        COALESCE(_to_org.name, 'Your client') || ' has rejected your invoice "' || NEW.invoice_number || '". Reason: ' || COALESCE(NEW.rejection_reason, 'Not specified'),
        'INVOICE',
        NEW.id,
        '/project/' || NEW.project_id || '?tab=invoices'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Invoice rejection alert failed for invoice %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_invoice_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Invoice payment alert failed for invoice %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.notify_invoice_status_change() IS 'Creates invoice status alerts without allowing alert/email failures to roll back invoice submission, approval, or rejection.';
COMMENT ON FUNCTION public.notify_invoice_paid() IS 'Creates payment alerts without allowing alert/email failures to roll back invoice payment closeout.';