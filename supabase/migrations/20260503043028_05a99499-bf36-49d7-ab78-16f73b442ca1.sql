CREATE OR REPLACE FUNCTION public.notify_co_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _type public.notification_type;
  _title text;
  _body text;
  _amount numeric;
  _is_tm boolean;
  _label text;
  _co_word text;
BEGIN
  -- Only act on transitions into approved/rejected
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    _type := 'CHANGE_APPROVED';
  ELSIF NEW.status = 'rejected' THEN
    _type := 'CHANGE_REJECTED';
  ELSE
    RETURN NEW;
  END IF;

  -- Don't notify if creator is unknown
  IF NEW.created_by_user_id IS NULL OR NEW.org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Derive T&M mode from the project's contract_mode instead of non-existent is_tm column
  SELECT (p.contract_mode = 'tm') INTO _is_tm
  FROM public.projects p
  WHERE p.id = NEW.project_id;
  _is_tm := COALESCE(_is_tm, false);

  _co_word := CASE WHEN _is_tm THEN 'Work order' ELSE 'Change order' END;
  _label := COALESCE(NEW.title, _co_word);
  _amount := public.co_grand_total(NEW.id);

  IF _type = 'CHANGE_APPROVED' THEN
    _title := _co_word || ' approved';
    _body := _label ||
      CASE WHEN _amount IS NOT NULL AND _amount > 0
           THEN ' — $' || to_char(_amount, 'FM999,999,990.00') || ' approved'
           ELSE ' has been approved' END;
  ELSE
    _title := _co_word || ' rejected';
    _body := _label || ' was rejected — check the detail page for the reason';
  END IF;

  INSERT INTO public.notifications (
    recipient_user_id,
    recipient_org_id,
    type,
    title,
    body,
    entity_type,
    entity_id,
    action_url,
    is_read
  ) VALUES (
    NEW.created_by_user_id,
    NEW.org_id,
    _type,
    _title,
    _body,
    'change_order',
    NEW.id,
    '/projects/' || NEW.project_id || '/change-orders/' || NEW.id,
    false
  );

  RETURN NEW;
END;
$$;