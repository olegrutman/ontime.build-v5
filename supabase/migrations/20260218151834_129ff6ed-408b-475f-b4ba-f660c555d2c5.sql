
-- 1. Create enums (using text checks since enums are harder to extend later)
-- We'll use text columns with CHECK constraints for status and priority

-- 2. Create project_rfis table
CREATE TABLE public.project_rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rfi_number SERIAL,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ANSWERED', 'CLOSED')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  submitted_by_org_id UUID NOT NULL REFERENCES public.organizations(id),
  submitted_by_user_id UUID NOT NULL,
  assigned_to_org_id UUID NOT NULL REFERENCES public.organizations(id),
  answered_by_user_id UUID,
  answered_at TIMESTAMPTZ,
  due_date DATE,
  reference_area TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Add notification types
ALTER TYPE public.notification_type ADD VALUE 'RFI_SUBMITTED';
ALTER TYPE public.notification_type ADD VALUE 'RFI_ANSWERED';

-- 4. Add can_create_rfis to member_permissions
ALTER TABLE public.member_permissions ADD COLUMN can_create_rfis BOOLEAN NOT NULL DEFAULT true;

-- 5. Enable RLS
ALTER TABLE public.project_rfis ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Users can view RFIs on their projects"
ON public.project_rfis FOR SELECT
TO authenticated
USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members can create RFIs"
ON public.project_rfis FOR INSERT
TO authenticated
WITH CHECK (
  public.has_project_access(auth.uid(), project_id)
  AND submitted_by_user_id = auth.uid()
);

CREATE POLICY "Assigned or submitting org can update RFIs"
ON public.project_rfis FOR UPDATE
TO authenticated
USING (
  public.has_project_access(auth.uid(), project_id)
  AND EXISTS (
    SELECT 1 FROM public.user_org_roles uor
    WHERE uor.user_id = auth.uid()
    AND (uor.organization_id = project_rfis.assigned_to_org_id
         OR uor.organization_id = project_rfis.submitted_by_org_id)
  )
);

-- 7. Updated_at trigger
CREATE TRIGGER update_project_rfis_updated_at
BEFORE UPDATE ON public.project_rfis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Notification trigger for RFI events
CREATE OR REPLACE FUNCTION public.notify_rfi_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_name TEXT;
  _notif_type notification_type;
  _recipient_org UUID;
  _title TEXT;
  _body TEXT;
BEGIN
  SELECT name INTO _project_name FROM projects WHERE id = NEW.project_id;

  IF TG_OP = 'INSERT' THEN
    _notif_type := 'RFI_SUBMITTED';
    _recipient_org := NEW.assigned_to_org_id;
    _title := 'New RFI: ' || NEW.subject;
    _body := 'RFI #' || NEW.rfi_number || ' submitted on ' || _project_name;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'OPEN' AND NEW.status = 'ANSWERED' THEN
    _notif_type := 'RFI_ANSWERED';
    _recipient_org := NEW.submitted_by_org_id;
    _title := 'RFI Answered: ' || NEW.subject;
    _body := 'RFI #' || NEW.rfi_number || ' on ' || _project_name || ' has been answered';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (
    type, title, body, entity_type, entity_id,
    recipient_org_id, action_url
  ) VALUES (
    _notif_type, _title, _body, 'rfi', NEW.id,
    _recipient_org, '/project/' || NEW.project_id || '?tab=rfis'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rfi_notifications
AFTER INSERT OR UPDATE ON public.project_rfis
FOR EACH ROW
EXECUTE FUNCTION public.notify_rfi_change();

-- 9. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_rfis;
