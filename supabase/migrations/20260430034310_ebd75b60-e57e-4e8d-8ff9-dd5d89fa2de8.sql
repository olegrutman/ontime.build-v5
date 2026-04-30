-- Fix PO_SENT notification: the send-po edge function sets status to 'SUBMITTED',
-- but the existing trigger only fired on legacy 'SENT'. Match both.
CREATE OR REPLACE FUNCTION public.notify_po_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supplier public.suppliers;
  _was_sent boolean;
  _is_sent boolean;
BEGIN
  _was_sent := OLD.status IN ('SENT', 'SUBMITTED');
  _is_sent  := NEW.status IN ('SENT', 'SUBMITTED');

  IF _is_sent AND NOT _was_sent THEN
    SELECT * INTO _supplier FROM public.suppliers WHERE id = NEW.supplier_id;

    IF _supplier.organization_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        recipient_org_id,
        type,
        title,
        body,
        entity_type,
        entity_id,
        action_url
      ) VALUES (
        _supplier.organization_id,
        'PO_SENT',
        'New Purchase Order: ' || COALESCE(NEW.po_number, ''),
        'You have received a new purchase order "' || COALESCE(NEW.po_name, '') || '"',
        'PO',
        NEW.id,
        '/purchase-orders'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;