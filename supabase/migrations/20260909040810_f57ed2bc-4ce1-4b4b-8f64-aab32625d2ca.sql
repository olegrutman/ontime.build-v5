CREATE OR REPLACE FUNCTION public.notify_supplier_estimate_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND upper(COALESCE(pp.role::text, '')) IN ('GC', 'GENERAL CONTRACTOR')
    ORDER BY pp.invited_at
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
$function$;