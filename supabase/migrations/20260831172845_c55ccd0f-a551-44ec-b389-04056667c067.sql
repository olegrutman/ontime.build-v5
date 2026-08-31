ALTER TABLE public.co_proposals
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_company text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS client_address text,
  ADD COLUMN IF NOT EXISTS site_address text,
  ADD COLUMN IF NOT EXISTS scope_notes text,
  ADD COLUMN IF NOT EXISTS exclusions text,
  ADD COLUMN IF NOT EXISTS terms_text text,
  ADD COLUMN IF NOT EXISTS deposit_note text,
  ADD COLUMN IF NOT EXISTS tax_percent numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.co_proposal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.co_proposals(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  due_trigger text,
  basis text NOT NULL DEFAULT 'percent',
  percent numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.co_proposal_milestones TO authenticated;
GRANT ALL ON public.co_proposal_milestones TO service_role;

ALTER TABLE public.co_proposal_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view proposal milestones"
ON public.co_proposal_milestones FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.co_proposals p
  WHERE p.id = co_proposal_milestones.proposal_id
    AND public.has_project_access(auth.uid(), p.project_id)
));

CREATE POLICY "Proposal owners can manage milestones"
ON public.co_proposal_milestones FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.co_proposals p
  WHERE p.id = co_proposal_milestones.proposal_id
    AND p.org_id = public.get_user_org_id(auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.co_proposals p
  WHERE p.id = co_proposal_milestones.proposal_id
    AND p.org_id = public.get_user_org_id(auth.uid())
));

CREATE INDEX IF NOT EXISTS idx_co_proposal_milestones_proposal
  ON public.co_proposal_milestones(proposal_id, sort_order);

CREATE TRIGGER update_co_proposal_milestones_updated_at
BEFORE UPDATE ON public.co_proposal_milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();