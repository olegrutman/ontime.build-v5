CREATE TABLE public.co_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_number text NOT NULL,
  title text NOT NULL DEFAULT 'Proposal',
  intro text,
  validity_days integer NOT NULL DEFAULT 30,
  payment_terms text,
  markup_percent numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  perspective text NOT NULL DEFAULT 'upstream',
  created_by_user_id uuid NOT NULL DEFAULT auth.uid(),
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT co_proposals_status_check CHECK (status IN ('draft','sent','accepted','declined')),
  CONSTRAINT co_proposals_number_unique UNIQUE (project_id, proposal_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.co_proposals TO authenticated;
GRANT ALL ON public.co_proposals TO service_role;

ALTER TABLE public.co_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project participants can view proposals"
ON public.co_proposals FOR SELECT TO authenticated
USING (public.user_is_project_participant(auth.uid(), project_id));

CREATE POLICY "Owning org can create proposals"
ON public.co_proposals FOR INSERT TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND public.user_is_project_participant(auth.uid(), project_id)
  AND EXISTS (
    SELECT 1 FROM public.user_org_roles uor
    WHERE uor.user_id = auth.uid() AND uor.organization_id = co_proposals.org_id
  )
);

CREATE POLICY "Owning org can update proposals"
ON public.co_proposals FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_org_roles uor
  WHERE uor.user_id = auth.uid() AND uor.organization_id = co_proposals.org_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_org_roles uor
  WHERE uor.user_id = auth.uid() AND uor.organization_id = co_proposals.org_id
));

CREATE POLICY "Owning org can delete proposals"
ON public.co_proposals FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_org_roles uor
  WHERE uor.user_id = auth.uid() AND uor.organization_id = co_proposals.org_id
));

CREATE TRIGGER update_co_proposals_updated_at
BEFORE UPDATE ON public.co_proposals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.co_proposal_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES public.co_proposals(id) ON DELETE CASCADE,
  change_order_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  amount_snapshot numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT co_proposal_items_unique UNIQUE (proposal_id, change_order_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.co_proposal_items TO authenticated;
GRANT ALL ON public.co_proposal_items TO service_role;

ALTER TABLE public.co_proposal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project participants can view proposal items"
ON public.co_proposal_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.co_proposals p
  WHERE p.id = co_proposal_items.proposal_id
    AND public.user_is_project_participant(auth.uid(), p.project_id)
));

CREATE POLICY "Owning org can manage proposal items"
ON public.co_proposal_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.co_proposals p
  JOIN public.user_org_roles uor ON uor.organization_id = p.org_id
  WHERE p.id = co_proposal_items.proposal_id AND uor.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.co_proposals p
  JOIN public.user_org_roles uor ON uor.organization_id = p.org_id
  WHERE p.id = co_proposal_items.proposal_id AND uor.user_id = auth.uid()
));

CREATE INDEX idx_co_proposals_project ON public.co_proposals(project_id, created_at DESC);
CREATE INDEX idx_co_proposal_items_proposal ON public.co_proposal_items(proposal_id, sort_order);
CREATE INDEX idx_co_proposal_items_co ON public.co_proposal_items(change_order_id);