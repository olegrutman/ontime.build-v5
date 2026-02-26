
-- Add new notification type
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'JOIN_REQUEST';

-- Create trigger function to notify admins of new join requests
CREATE OR REPLACE FUNCTION public.notify_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_name text;
  _org_name text;
  _admin record;
BEGIN
  -- Get requesting user's name
  SELECT COALESCE(p.full_name, p.email, 'Someone') INTO _user_name
  FROM profiles p WHERE p.user_id = NEW.user_id;

  -- Get organization name
  SELECT o.name INTO _org_name
  FROM organizations o WHERE o.id = NEW.organization_id;

  -- Notify each admin in the organization
  FOR _admin IN
    SELECT uor.user_id
    FROM user_org_roles uor
    WHERE uor.organization_id = NEW.organization_id
      AND uor.is_admin = true
  LOOP
    INSERT INTO notifications (
      type, title, body, entity_type, entity_id,
      action_url, recipient_org_id, recipient_user_id
    ) VALUES (
      'JOIN_REQUEST',
      'New Join Request',
      _user_name || ' has requested to join ' || _org_name,
      'ORG',
      NEW.organization_id,
      '/org/team',
      NEW.organization_id,
      _admin.user_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_notify_join_request ON public.org_join_requests;
CREATE TRIGGER trg_notify_join_request
  AFTER INSERT ON public.org_join_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_join_request();
