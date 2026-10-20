CREATE TABLE public.crew_hired_crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  phone text CHECK (phone IS NULL OR length(phone) <= 40),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX crew_hired_crews_org_name ON public.crew_hired_crews (organization_id, lower(btrim(name)));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_hired_crews TO authenticated;
GRANT ALL ON public.crew_hired_crews TO service_role;
ALTER TABLE public.crew_hired_crews ENABLE ROW LEVEL SECURITY;
CREATE POLICY crew_hired_crews_private ON public.crew_hired_crews FOR ALL TO authenticated
USING (public.user_in_org(auth.uid(), organization_id) AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.type = 'FC'))
WITH CHECK (public.user_in_org(auth.uid(), organization_id) AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.type = 'FC'));