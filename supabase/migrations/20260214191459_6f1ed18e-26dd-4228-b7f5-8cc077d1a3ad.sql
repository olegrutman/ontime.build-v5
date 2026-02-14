-- Trigger function: notify when a change order (work order) status changes
-- to ready_for_approval, approved, or rejected
CREATE OR REPLACE FUNCTION public.notify_change_order_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _project projects;
  _gc_org organizations;
  _notif_type notification_type;
  _notif_title text;
  _notif_body text;
  _action_url text;
  _participant RECORD;
  _creator_profile RECORD;
  _actor_name text;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get project + GC org info
  SELECT * INTO _project FROM projects WHERE id = NEW.project_id;
  SELECT * INTO _gc_org FROM organizations WHERE id = _project.organization_id;

  _action_url := '/change-order/' || NEW.id::text;

  -- Get creator name for body text
  SELECT first_name, last_name INTO _creator_profile
  FROM profiles WHERE user_id = NEW.created_by;
  _actor_name := COALESCE(
    NULLIF(TRIM(COALESCE(_creator_profile.first_name, '') || ' ' || COALESCE(_creator_profile.last_name, '')), ''),
    'A team member'
  );

  -- SUBMITTED FOR APPROVAL → notify GC (project owner)
  IF NEW.status = 'ready_for_approval' AND OLD.status != 'ready_for_approval' THEN
    INSERT INTO notifications (
      recipient_org_id,
      type,
      title,
      body,
      entity_type,
      entity_id,
      action_url
    ) VALUES (
      _project.organization_id,
      'CHANGE_SUBMITTED',
      'Work Order Ready for Approval: ' || NEW.title,
      'Work order "' || NEW.title || '" on ' || _project.name || ' is ready for your review.',
      'change_order',
      NEW.id,
      _action_url
    );
  END IF;

  -- APPROVED → notify all participants (TC + FC)
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    FOR _participant IN
      SELECT DISTINCT cp.organization_id
      FROM change_order_participants cp
      WHERE cp.change_order_id = NEW.id
        AND cp.is_active = true
        AND cp.organization_id != _project.organization_id  -- exclude GC
    LOOP
      INSERT INTO notifications (
        recipient_org_id,
        type,
        title,
        body,
        entity_type,
        entity_id,
        action_url
      ) VALUES (
        _participant.organization_id,
        'CHANGE_APPROVED',
        'Work Order Approved: ' || NEW.title,
        _gc_org.name || ' has approved work order "' || NEW.title || '" on ' || _project.name || '.',
        'change_order',
        NEW.id,
        _action_url
      );
    END LOOP;
  END IF;

  -- REJECTED → notify all participants (TC + FC)
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    FOR _participant IN
      SELECT DISTINCT cp.organization_id
      FROM change_order_participants cp
      WHERE cp.change_order_id = NEW.id
        AND cp.is_active = true
        AND cp.organization_id != _project.organization_id  -- exclude GC
    LOOP
      INSERT INTO notifications (
        recipient_org_id,
        type,
        title,
        body,
        entity_type,
        entity_id,
        action_url
      ) VALUES (
        _participant.organization_id,
        'CHANGE_REJECTED',
        'Work Order Rejected: ' || NEW.title,
        _gc_org.name || ' has rejected work order "' || NEW.title || '"'
          || CASE WHEN NEW.rejection_notes IS NOT NULL THEN ': ' || NEW.rejection_notes ELSE '' END
          || '.',
        'change_order',
        NEW.id,
        _action_url
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Attach trigger to change_order_projects
CREATE TRIGGER trg_notify_change_order_status
  AFTER UPDATE ON public.change_order_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_change_order_status();