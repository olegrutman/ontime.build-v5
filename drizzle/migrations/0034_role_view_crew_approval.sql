DO $$
DECLARE d text;
BEGIN
  d := pg_get_viewdef('public.change_orders_role_view'::regclass, true);
  d := regexp_replace(d, '\s+FROM change_orders co;?\s*$', '');
  d := d || $c$,
    CASE WHEN co_viewer_role(id) = ANY (ARRAY['tc'::text, 'fc'::text]) THEN crew_approved_at ELSE NULL::timestamptz END AS crew_approved_at,
    CASE WHEN co_viewer_role(id) = ANY (ARRAY['tc'::text, 'fc'::text]) THEN crew_approved_by_user_id ELSE NULL::uuid END AS crew_approved_by_user_id,
    CASE WHEN co_viewer_role(id) = 'tc'::text THEN kept_internal ELSE false END AS kept_internal
   FROM change_orders co$c$;
  EXECUTE 'CREATE OR REPLACE VIEW public.change_orders_role_view AS ' || d;
END $$;