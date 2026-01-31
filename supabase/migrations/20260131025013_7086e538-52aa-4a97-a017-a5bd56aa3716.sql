-- Add invoice notification types to enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INVOICE_SUBMITTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INVOICE_APPROVED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'INVOICE_REJECTED';

-- Create the comprehensive trigger function for invoice status changes
CREATE OR REPLACE FUNCTION notify_invoice_status_change()
RETURNS TRIGGER AS $$
DECLARE
  _contract project_contracts;
  _from_org organizations;
  _to_org organizations;
BEGIN
  -- Get contract details (required for all notification types)
  SELECT * INTO _contract FROM project_contracts WHERE id = NEW.contract_id;
  
  -- If no contract, exit early
  IF _contract.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get org names for notification body
  SELECT * INTO _from_org FROM organizations WHERE id = _contract.from_org_id;
  SELECT * INTO _to_org FROM organizations WHERE id = _contract.to_org_id;
  
  -- Handle SUBMITTED status - notify the receiver (to_org) who needs to approve
  IF NEW.status = 'SUBMITTED' AND (OLD.status IS NULL OR OLD.status != 'SUBMITTED') THEN
    INSERT INTO notifications (
      recipient_org_id,
      type,
      title,
      body,
      entity_type,
      entity_id,
      action_url
    ) VALUES (
      _contract.to_org_id,
      'INVOICE_SUBMITTED',
      'Invoice Received: ' || NEW.invoice_number,
      COALESCE(_from_org.name, 'A contractor') || ' has submitted invoice "' || NEW.invoice_number || '" for $' || ROUND(NEW.total_amount::numeric, 2)::text,
      'INVOICE',
      NEW.id,
      '/project/' || NEW.project_id || '?tab=invoices'
    );
  END IF;
  
  -- Handle APPROVED status - notify the sender (from_org)
  IF NEW.status = 'APPROVED' AND OLD.status = 'SUBMITTED' THEN
    INSERT INTO notifications (
      recipient_org_id,
      type,
      title,
      body,
      entity_type,
      entity_id,
      action_url
    ) VALUES (
      _contract.from_org_id,
      'INVOICE_APPROVED',
      'Invoice Approved: ' || NEW.invoice_number,
      COALESCE(_to_org.name, 'Your client') || ' has approved your invoice "' || NEW.invoice_number || '" for $' || ROUND(NEW.total_amount::numeric, 2)::text,
      'INVOICE',
      NEW.id,
      '/project/' || NEW.project_id || '?tab=invoices'
    );
  END IF;
  
  -- Handle REJECTED status - notify the sender (from_org)
  IF NEW.status = 'REJECTED' AND OLD.status = 'SUBMITTED' THEN
    INSERT INTO notifications (
      recipient_org_id,
      type,
      title,
      body,
      entity_type,
      entity_id,
      action_url
    ) VALUES (
      _contract.from_org_id,
      'INVOICE_REJECTED',
      'Invoice Rejected: ' || NEW.invoice_number,
      COALESCE(_to_org.name, 'Your client') || ' has rejected your invoice "' || NEW.invoice_number || '". Reason: ' || COALESCE(NEW.rejection_reason, 'Not specified'),
      'INVOICE',
      NEW.id,
      '/project/' || NEW.project_id || '?tab=invoices'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger (drop first if exists to avoid conflicts)
DROP TRIGGER IF EXISTS notify_invoice_status_change ON invoices;
CREATE TRIGGER notify_invoice_status_change
  AFTER UPDATE OF status ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION notify_invoice_status_change();