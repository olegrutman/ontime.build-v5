
CREATE OR REPLACE FUNCTION public.suggest_orgs_by_email_domain(_email text)
RETURNS TABLE (
  org_id uuid,
  org_name text,
  org_type text,
  member_count bigint,
  allow_join_requests boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d AS (
    SELECT lower(split_part(_email, '@', 2)) AS domain
  )
  SELECT
    o.id AS org_id,
    o.name AS org_name,
    o.type::text AS org_type,
    COUNT(DISTINCT uor.user_id) AS member_count,
    COALESCE(o.allow_join_requests, false) AS allow_join_requests
  FROM public.organizations o
  JOIN public.user_org_roles uor ON uor.organization_id = o.id
  JOIN auth.users u ON u.id = uor.user_id
  CROSS JOIN d
  WHERE d.domain <> ''
    AND d.domain NOT IN ('gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','aol.com','proton.me','protonmail.com','me.com','live.com','msn.com')
    AND lower(split_part(u.email, '@', 2)) = d.domain
  GROUP BY o.id, o.name, o.type, o.allow_join_requests
  ORDER BY member_count DESC
  LIMIT 3;
$$;

GRANT EXECUTE ON FUNCTION public.suggest_orgs_by_email_domain(text) TO anon, authenticated;
