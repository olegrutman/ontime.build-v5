-- Update the notify_project_invite trigger to only fire for INVITED status
-- and create a separate notification for when orgs are directly added (ACCEPTED)

CREATE OR REPLACE FUNCTION public.notify_project_invite()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project projects;
  _inviter_org organizations;
BEGIN
  -- Only create invite notifications for INVITED status
  -- ACCEPTED status means they were directly added
  IF NEW.invite_status = 'INVITED' THEN
    -- Get project details
    SELECT * INTO _project FROM projects WHERE id = NEW.project_id;
    
    -- Get inviter's org name
    SELECT * INTO _inviter_org FROM organizations WHERE id = _project.organization_id;
    
    -- Create notification for invited org
    INSERT INTO notifications (
      recipient_org_id,
      type,
      title,
      body,
      entity_type,
      entity_id,
      action_url
    ) VALUES (
      NEW.organization_id,
      'PROJECT_INVITE',
      'Project Invitation: ' || _project.name,
      _inviter_org.name || ' has invited your organization to join project "' || _project.name || '"',
      'PROJECT',
      NEW.project_id,
      '/project/' || NEW.project_id
    );
  ELSIF NEW.invite_status = 'ACCEPTED' THEN
    -- For direct additions (not via invite), create a different notification
    SELECT * INTO _project FROM projects WHERE id = NEW.project_id;
    SELECT * INTO _inviter_org FROM organizations WHERE id = _project.organization_id;
    
    INSERT INTO notifications (
      recipient_org_id,
      type,
      title,
      body,
      entity_type,
      entity_id,
      action_url
    ) VALUES (
      NEW.organization_id,
      'PROJECT_ADDED',
      'Added to Project: ' || _project.name,
      'Your organization has been added to project "' || _project.name || '" by ' || COALESCE(_inviter_org.name, 'the project owner'),
      'PROJECT',
      NEW.project_id,
      '/project/' || NEW.project_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add PROJECT_ADDED to notification_type enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'PROJECT_ADDED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'PROJECT_ADDED';
  END IF;
END $$;