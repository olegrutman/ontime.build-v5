CREATE OR REPLACE FUNCTION public.notify_project_invite()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project projects;
  _inviter_org organizations;
  _invited_org organizations;
BEGIN
  SELECT * INTO _project FROM projects WHERE id = NEW.project_id;
  SELECT * INTO _invited_org FROM organizations WHERE id = NEW.organization_id;
  
  SELECT o.* INTO _inviter_org 
  FROM user_org_roles uor
  JOIN organizations o ON o.id = uor.organization_id
  WHERE uor.user_id = NEW.invited_by
  LIMIT 1;
  
  IF _inviter_org IS NULL THEN
    SELECT * INTO _inviter_org FROM organizations WHERE id = _project.organization_id;
  END IF;
  
  IF NEW.invite_status = 'INVITED' AND (OLD IS NULL OR OLD.invite_status <> 'INVITED') THEN
    INSERT INTO notifications (
      type, title, body, entity_type, entity_id, recipient_org_id, action_url
    ) VALUES (
      'PROJECT_INVITE',
      'New Project Invitation',
      COALESCE(_inviter_org.name, 'An organization') || ' has invited you to join project "' || _project.name || '"',
      'project_participant',
      NEW.id,
      NEW.organization_id,
      '/dashboard'
    );
  END IF;
  
  IF NEW.invite_status = 'ACCEPTED' AND OLD.invite_status = 'INVITED' THEN
    INSERT INTO notifications (
      type, title, body, entity_type, entity_id, recipient_org_id, action_url
    ) VALUES (
      'PROJECT_INVITE_ACCEPTED',
      'Invitation Accepted',
      COALESCE(_invited_org.name, 'An organization') || ' has accepted your invitation to project "' || _project.name || '"',
      'project_participant',
      NEW.id,
      _inviter_org.id,
      '/project/' || NEW.project_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;