
CREATE OR REPLACE FUNCTION public.get_org_features(p_org_id uuid)
 RETURNS TABLE(feature_key text, enabled boolean, limit_value integer, source text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan_id UUID;
BEGIN
  -- Authorization guard: only org members or platform users
  IF NOT (user_in_org(auth.uid(), p_org_id) OR is_platform_user(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to view features for this organization';
  END IF;

  SELECT subscription_plan_id INTO v_plan_id
  FROM organizations
  WHERE id = p_org_id;

  RETURN QUERY
  WITH plan_defaults AS (
    SELECT
      pf.feature_key,
      pf.enabled,
      pf.limit_value,
      'plan'::TEXT AS source
    FROM plan_features pf
    WHERE pf.plan_id = v_plan_id
  ),
  org_overrides AS (
    SELECT
      ofo.feature_key,
      ofo.enabled,
      ofo.limit_value,
      'override'::TEXT AS source
    FROM org_feature_overrides ofo
    WHERE ofo.organization_id = p_org_id
  )
  SELECT DISTINCT ON (COALESCE(o.feature_key, p.feature_key))
    COALESCE(o.feature_key, p.feature_key),
    COALESCE(o.enabled, p.enabled, false),
    COALESCE(o.limit_value, p.limit_value),
    COALESCE(o.source, p.source, 'none')
  FROM plan_defaults p
  FULL OUTER JOIN org_overrides o ON p.feature_key = o.feature_key
  ORDER BY COALESCE(o.feature_key, p.feature_key),
           CASE WHEN o.feature_key IS NOT NULL THEN 0 ELSE 1 END;
END;
$function$;
