CREATE OR REPLACE FUNCTION public.search_organizations_for_join(
  _state TEXT DEFAULT NULL,
  _trade TEXT DEFAULT NULL,
  _query TEXT DEFAULT NULL,
  _limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  org_type TEXT,
  org_trade TEXT,
  org_address JSONB,
  admin_name TEXT,
  allow_join_requests BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS org_id,
    o.name AS org_name,
    o.type::TEXT AS org_type,
    o.trade AS org_trade,
    o.address AS org_address,
    (SELECT p.full_name FROM profiles p
     JOIN user_org_roles uor ON uor.user_id = p.user_id
     WHERE uor.organization_id = o.id
     AND uor.role IN ('GC_PM', 'TC_PM', 'FC_PM')
     LIMIT 1
    ) AS admin_name,
    o.allow_join_requests
  FROM organizations o
  WHERE
    (_state IS NULL OR _state = '' OR TRIM(o.address->>'state') ILIKE TRIM(_state))
    AND (_trade IS NULL OR _trade = '' OR TRIM(o.trade) ILIKE '%' || TRIM(_trade) || '%')
    AND (_query IS NULL OR _query = '' OR o.name ILIKE '%' || _query || '%')
  ORDER BY o.name
  LIMIT _limit;
END;
$$;