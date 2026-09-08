CREATE OR REPLACE FUNCTION public.notify_fc_input_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _co RECORD;
  _requester_name text;
  _label text;
  _doc text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  SELECT co.id, co.project_id, co.co_number, co.title, co.document_type, co.org_id
    INTO _co
  FROM public.change_orders co
  WHERE co.id = NEW.co_id;

  IF _co.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT o.name INTO _requester_name
  FROM public.organizations o
  WHERE o.id = _co.org_id;

  _doc := CASE WHEN _co.document_type = 'WO' THEN 'work order' ELSE 'change order' END;
  _label := COALESCE(NULLIF(_co.co_number, ''), 'the ' || _doc)
            || COALESCE(' — ' || NULLIF(_co.title, ''), '');

  INSERT INTO public.notifications (
    recipient_user_id, recipient_org_id, type, title, body,
    entity_type, entity_id, action_url, is_read
  )
  SELECT
    uor.user_id,
    NEW.organization_id,
    'WORK_ORDER_ASSIGNED'::public.notification_type,
    COALESCE(_requester_name || ' requested your input', 'Your input was requested'),
    _label,
    'change_order',
    _co.id,
    '/project/' || _co.project_id || '/change-orders/' || _co.id,
    false
  FROM public.user_org_roles uor
  WHERE uor.organization_id = NEW.organization_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_fc_input_requested ON public.change_order_collaborators;

CREATE TRIGGER trg_notify_fc_input_requested
AFTER INSERT OR UPDATE OF status ON public.change_order_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.notify_fc_input_requested();