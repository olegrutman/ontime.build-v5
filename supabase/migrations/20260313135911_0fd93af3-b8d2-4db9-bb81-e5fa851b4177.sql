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