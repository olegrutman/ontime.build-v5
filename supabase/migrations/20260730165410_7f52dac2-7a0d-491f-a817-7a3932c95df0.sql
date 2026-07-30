DO $mig$
DECLARE
  v_b text[] := ARRAY['actual_cost_entries','backcharges','co_activity','co_ai_intakes','co_sov_lines','estimate_catalog_mapping','gc_owner_billings','payment_applications','project_estimates','project_rfis','project_schedule_items','reminders','returns','rfis','supplier_estimates'];
  v_skip text[] := ARRAY['project_invites','project_team'];
  v_batch text;
  v_tables text[];
  t text; r record; v_roles text; v_notnull boolean; v_new_qual text;
BEGIN
  FOR v_batch IN SELECT unnest(ARRAY['B','C']) LOOP
    IF v_batch = 'B' THEN
      v_tables := v_b;
    ELSE
      SELECT array_agg(DISTINCT c.relname ORDER BY c.relname) INTO v_tables
      FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_attribute a ON a.attrelid=c.oid AND a.attname='project_id' AND NOT a.attisdropped AND a.attnum>0
      JOIN pg_policies p ON p.schemaname='public' AND p.tablename=c.relname AND p.cmd='SELECT'
      WHERE n.nspname='public' AND c.relkind='r'
        AND c.relname NOT IN ('projects','project_members','project_participants','access_audit_log',
                              '_phase2_policy_backup','_phase2_access_baseline','_phase2_conversion_log',
                              'purchase_orders','change_orders','invoices','project_sov_items')
        AND c.relname <> ALL (v_b)
        AND c.relname NOT LIKE '%\_role\_view';
    END IF;

    FOREACH t IN ARRAY coalesce(v_tables, '{}'::text[]) LOOP
      SELECT a.attnotnull INTO v_notnull FROM pg_attribute a
      WHERE a.attrelid = ('public.'||t)::regclass AND a.attname='project_id' AND NOT a.attisdropped;

      FOR r IN SELECT policyname, roles, qual FROM pg_policies
               WHERE schemaname='public' AND tablename=t AND cmd='SELECT' ORDER BY policyname LOOP
        IF t = ANY (v_skip) THEN
          INSERT INTO public._phase2_conversion_log(batch,tbl,policyname,roles,original_qual,new_qual,action,reason)
          VALUES (v_batch,t,r.policyname,r.roles::text,r.qual,NULL,'flagged',
                  'Pre-access invite read path: qual matches invited_email/invited_by for users who cannot yet see the project. AND-ing can_see_project would break invite acceptance. Needs explicit decision.');
          CONTINUE;
        END IF;
        IF r.qual ILIKE '%is_platform_user%' THEN
          INSERT INTO public._phase2_conversion_log(batch,tbl,policyname,roles,original_qual,new_qual,action,reason)
          VALUES (v_batch,t,r.policyname,r.roles::text,r.qual,NULL,'skipped','platform-staff policy, excluded by spec');
          CONTINUE;
        END IF;
        IF r.qual ILIKE '%can_see_project%' THEN
          INSERT INTO public._phase2_conversion_log(batch,tbl,policyname,roles,original_qual,new_qual,action,reason)
          VALUES (v_batch,t,r.policyname,r.roles::text,r.qual,NULL,'skipped','already references can_see_project');
          CONTINUE;
        END IF;

        SELECT string_agg(CASE WHEN x='public' THEN 'PUBLIC' ELSE quote_ident(x) END, ', ') INTO v_roles
        FROM unnest(r.roles::text[]) AS x;

        IF v_notnull THEN
          v_new_qual := '(' || r.qual || ') AND public.can_see_project(project_id)';
        ELSE
          v_new_qual := '(' || r.qual || ') AND (project_id IS NULL OR public.can_see_project(project_id))';
        END IF;

        EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO %s USING (%s)', r.policyname, t, v_roles, v_new_qual);

        INSERT INTO public._phase2_conversion_log(batch,tbl,policyname,roles,original_qual,new_qual,action,reason)
        VALUES (v_batch,t,r.policyname,r.roles::text,r.qual,v_new_qual,'converted',
                CASE WHEN v_notnull THEN 'AND-ed (project_id NOT NULL)' ELSE 'AND-ed with NULL guard' END);
      END LOOP;
    END LOOP;
  END LOOP;
END
$mig$;