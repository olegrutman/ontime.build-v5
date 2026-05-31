CREATE TABLE public.gc_owner_billings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  gc_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  billing_number text,
  billed_amount numeric(14,2) NOT NULL DEFAULT 0,
  collected_amount numeric(14,2) NOT NULL DEFAULT 0,
  billed_at date NOT NULL DEFAULT CURRENT_DATE,
  collected_at date,
  notes text,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gc_owner_billings_project ON public.gc_owner_billings(project_id);
CREATE INDEX idx_gc_owner_billings_gc_org   ON public.gc_owner_billings(gc_org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gc_owner_billings TO authenticated;
GRANT ALL ON public.gc_owner_billings TO service_role;

ALTER TABLE public.gc_owner_billings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_is_gc_in_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_org_roles uor
    JOIN public.organizations o ON o.id = uor.organization_id
    WHERE uor.user_id = _user_id
      AND uor.organization_id = _org_id
      AND o.type = 'GC'::org_type
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_is_gc_in_org(uuid, uuid) TO authenticated;

CREATE POLICY "GC members can view their owner billings"
ON public.gc_owner_billings
FOR SELECT TO authenticated
USING (public.is_project_participant(project_id, auth.uid()) AND public.user_is_gc_in_org(auth.uid(), gc_org_id));

CREATE POLICY "GC members can insert their owner billings"
ON public.gc_owner_billings
FOR INSERT TO authenticated
WITH CHECK (public.is_project_participant(project_id, auth.uid()) AND public.user_is_gc_in_org(auth.uid(), gc_org_id));

CREATE POLICY "GC members can update their owner billings"
ON public.gc_owner_billings
FOR UPDATE TO authenticated
USING (public.is_project_participant(project_id, auth.uid()) AND public.user_is_gc_in_org(auth.uid(), gc_org_id))
WITH CHECK (public.is_project_participant(project_id, auth.uid()) AND public.user_is_gc_in_org(auth.uid(), gc_org_id));

CREATE POLICY "GC members can delete their owner billings"
ON public.gc_owner_billings
FOR DELETE TO authenticated
USING (public.is_project_participant(project_id, auth.uid()) AND public.user_is_gc_in_org(auth.uid(), gc_org_id));

CREATE TRIGGER trg_gc_owner_billings_updated_at
BEFORE UPDATE ON public.gc_owner_billings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();