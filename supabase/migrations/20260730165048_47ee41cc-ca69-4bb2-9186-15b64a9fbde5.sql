CREATE TABLE IF NOT EXISTS public._phase2_policy_backup AS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public';

ALTER TABLE public._phase2_policy_backup ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public._phase2_policy_backup TO service_role;

CREATE TABLE IF NOT EXISTS public._phase2_access_baseline AS
SELECT r.user_id, v.project_id
FROM public.user_org_roles r
CROSS JOIN LATERAL public.projects_visible_via_org(r.user_id) AS v(project_id);

ALTER TABLE public._phase2_access_baseline ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public._phase2_access_baseline TO service_role;

CREATE TABLE IF NOT EXISTS public._phase2_conversion_log (
  id bigserial PRIMARY KEY,
  batch text NOT NULL,
  tbl text NOT NULL,
  policyname text NOT NULL,
  roles text NOT NULL,
  original_qual text,
  new_qual text,
  action text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public._phase2_conversion_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public._phase2_conversion_log TO service_role;

GRANT EXECUTE ON FUNCTION public.can_see_project(uuid) TO public;
GRANT EXECUTE ON FUNCTION public.projects_visible_via_org(uuid) TO public;

DROP POLICY "Org members can view own projects" ON public.projects;
CREATE POLICY "Org members can view own projects" ON public.projects
  FOR SELECT TO public
  USING ( public.can_see_project(id) );

INSERT INTO public._phase2_conversion_log (batch, tbl, policyname, roles, original_qual, new_qual, action, reason)
VALUES ('projects', 'projects', 'Org members can view own projects', '{public}',
        'user_in_org(auth.uid(), organization_id)', 'can_see_project(id)', 'replaced',
        'Step 2 sanctioned exception: can_see_project org path contains user_in_org logic');