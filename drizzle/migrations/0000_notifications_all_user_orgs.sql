CREATE OR REPLACE FUNCTION public.get_my_notifications(_limit integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, type notification_type, title text, body text, entity_type text, entity_id uuid, action_url text, is_read boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    n.id, n.type, n.title, n.body, n.entity_type, n.entity_id, n.action_url,
    CASE
      WHEN n.recipient_user_id IS NOT NULL THEN n.is_read
      ELSE COALESCE(user_has_read_notification(_user_id, n.id), false)
    END as is_read,
    n.created_at
  FROM notifications n
  WHERE
    n.recipient_user_id = _user_id
    OR (n.recipient_user_id IS NULL AND n.recipient_org_id IN (
      SELECT r.organization_id FROM user_org_roles r WHERE r.user_id = _user_id
    ))
  ORDER BY n.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_unread_count()
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _count integer;
BEGIN
  SELECT COUNT(*)::integer INTO _count
  FROM notifications n
  WHERE (
    (n.recipient_user_id = _user_id AND n.is_read = false)
    OR (n.recipient_user_id IS NULL
        AND n.recipient_org_id IN (
          SELECT r.organization_id FROM user_org_roles r WHERE r.user_id = _user_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM notification_reads nr
          WHERE nr.notification_id = n.id AND nr.user_id = _user_id
        ))
  );
  RETURN _count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  UPDATE notifications SET is_read = true
  WHERE recipient_user_id = _user_id AND is_read = false;

  INSERT INTO notification_reads (notification_id, user_id)
  SELECT n.id, _user_id
  FROM notifications n
  WHERE n.recipient_user_id IS NULL
    AND n.recipient_org_id IN (
      SELECT r.organization_id FROM user_org_roles r WHERE r.user_id = _user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM notification_reads nr
      WHERE nr.notification_id = n.id AND nr.user_id = _user_id
    )
  ON CONFLICT (notification_id, user_id) DO NOTHING;
END;
$function$;