
-- Create rfis table
CREATE TABLE public.rfis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rfi_number text NOT NULL,
  title text NOT NULL,
  question text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','closed','void')),
  submitted_by_user_id uuid REFERENCES auth.users(id),
  submitted_by_org_id uuid REFERENCES public.organizations(id),
  submitted_to_org_id uuid REFERENCES public.organizations(id),
  asked_at timestamptz NOT NULL DEFAULT now(),
  answer text,
  answered_by_user_id uuid REFERENCES auth.users(id),
  answered_at timestamptz,
  due_date date,
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low','normal','high','critical')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-generate rfi_number per project
CREATE OR REPLACE FUNCTION public.generate_rfi_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CAST(REPLACE(rfi_number, 'RFI-', '') AS integer)
  ), 0) + 1
  INTO next_num
  FROM public.rfis
  WHERE project_id = NEW.project_id;
  
  NEW.rfi_number := 'RFI-' || LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rfis_auto_number
  BEFORE INSERT ON public.rfis
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_rfi_number();

-- Updated_at trigger
CREATE TRIGGER update_rfis_updated_at
  BEFORE UPDATE ON public.rfis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project participants can view rfis"
  ON public.rfis FOR SELECT
  USING (public.is_project_participant(project_id, auth.uid()));

CREATE POLICY "Project participants can create rfis"
  ON public.rfis FOR INSERT
  WITH CHECK (public.is_project_participant(project_id, auth.uid()));

CREATE POLICY "Submitter or recipient org can update rfis"
  ON public.rfis FOR UPDATE
  USING (public.is_project_participant(project_id, auth.uid()));

-- Create rfi_attachments table
CREATE TABLE public.rfi_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfi_id uuid NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  uploaded_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rfi_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RFI participants can view attachments"
  ON public.rfi_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.rfis r
    WHERE r.id = rfi_id
    AND public.is_project_participant(r.project_id, auth.uid())
  ));

CREATE POLICY "Authenticated users can add attachments"
  ON public.rfi_attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.rfis r
    WHERE r.id = rfi_id
    AND public.is_project_participant(r.project_id, auth.uid())
  ));

-- Add blocked_by_rfi_id to change_orders
ALTER TABLE public.change_orders
  ADD COLUMN blocked_by_rfi_id uuid REFERENCES public.rfis(id) ON DELETE SET NULL;

-- Trigger: when RFI answered, notify blocked CO owners
CREATE OR REPLACE FUNCTION public.notify_co_rfi_unblocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  blocked_co RECORD;
BEGIN
  IF NEW.status = 'answered' AND (OLD.status IS DISTINCT FROM 'answered') THEN
    FOR blocked_co IN
      SELECT co.id, co.co_number, co.org_id, co.project_id
      FROM public.change_orders co
      WHERE co.blocked_by_rfi_id = NEW.id
    LOOP
      INSERT INTO public.notifications (
        user_id, type, title, body, project_id, entity_id, entity_type
      )
      SELECT
        pp.user_id,
        'rfi_answered',
        'RFI Answered — You Can Proceed',
        NEW.rfi_number || ' "' || NEW.title || '" has been answered. ' || blocked_co.co_number || ' is no longer blocked.',
        blocked_co.project_id,
        blocked_co.id,
        'change_order'
      FROM public.project_participants pp
      WHERE pp.project_id = blocked_co.project_id
        AND pp.organization_id = blocked_co.org_id
        AND pp.invite_status = 'ACCEPTED';
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rfi_answered_notify
  AFTER UPDATE ON public.rfis
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_co_rfi_unblocked();

-- Index for performance
CREATE INDEX idx_rfis_project_id ON public.rfis(project_id);
CREATE INDEX idx_rfis_status ON public.rfis(project_id, status);
CREATE INDEX idx_change_orders_blocked_by_rfi ON public.change_orders(blocked_by_rfi_id) WHERE blocked_by_rfi_id IS NOT NULL;
