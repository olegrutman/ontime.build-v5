-- Create backcharges table
CREATE TABLE public.backcharges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_co_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  responsible_org_id uuid REFERENCES public.organizations(id),
  responsible_party_name text,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'disputed', 'accepted', 'deducted', 'withdrawn')),
  gc_approved boolean NOT NULL DEFAULT false,
  gc_approved_at timestamptz,
  dispute_note text,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backcharges ENABLE ROW LEVEL SECURITY;

-- Policies: project participants can view
CREATE POLICY "Project participants can view backcharges"
  ON public.backcharges FOR SELECT
  TO authenticated
  USING (public.is_project_participant(project_id, auth.uid()));

-- Creator can insert
CREATE POLICY "Authenticated users can create backcharges on their projects"
  ON public.backcharges FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND public.is_project_participant(project_id, auth.uid())
  );

-- Participants can update (accept/dispute/deduct handled in app logic)
CREATE POLICY "Project participants can update backcharges"
  ON public.backcharges FOR UPDATE
  TO authenticated
  USING (public.is_project_participant(project_id, auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_backcharges_updated_at
  BEFORE UPDATE ON public.backcharges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();