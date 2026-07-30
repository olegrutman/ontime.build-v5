DO $mig$
DECLARE
  v_tables text[] := ARRAY['purchase_orders','change_orders','invoices','project_sov_items'];
  t text;
  r record;
  v_roles text;
  v_notnull boolean;
  v_new_qual text;
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    SELECT a.attnotnull INTO v_notnull
    FROM pg_attribute a
    WHERE a.attrelid = ('public.'||t)::regclass AND a.attname='project_id' AND NOT a.attisdropped;

    FOR r IN
      SELECT policyname, roles, qual
      FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
      ORDER BY policyname
    LOOP
      IF r.qual ILIKE '%is_platform_user%' THEN
        INSERT INTO public._phase2_conversion_log(batch,tbl,policyname,roles,original_qual,new_qual,action,reason)
        VALUES ('A',t,r.policyname,r.roles::text,r.qual,NULL,'skipped','platform-staff policy, excluded by spec');
        CONTINUE;
      END IF;
      IF r.qual ILIKE '%can_see_project%' THEN
        INSERT INTO public._phase2_conversion_log(batch,tbl,policyname,roles,original_qual,new_qual,action,reason)
        VALUES ('A',t,r.policyname,r.roles::text,r.qual,NULL,'skipped','already references can_see_project');
        CONTINUE;
      END IF;

      SELECT string_agg(CASE WHEN x = 'public' THEN 'PUBLIC' ELSE quote_ident(x) END, ', ')
        INTO v_roles
      FROM unnest(r.roles::text[]) AS x;

      IF v_notnull THEN
        v_new_qual := '(' || r.qual || ') AND public.can_see_project(project_id)';
      ELSE
        v_new_qual := '(' || r.qual || ') AND (project_id IS NULL OR public.can_see_project(project_id))';
      END IF;

      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO %s USING (%s)',
                     r.policyname, t, v_roles, v_new_qual);

      INSERT INTO public._phase2_conversion_log(batch,tbl,policyname,roles,original_qual,new_qual,action,reason)
      VALUES ('A',t,r.policyname,r.roles::text,r.qual,v_new_qual,'converted',
              CASE WHEN v_notnull THEN 'AND-ed (project_id NOT NULL)' ELSE 'AND-ed with NULL guard' END);
    END LOOP;
  END LOOP;
END
$mig$;