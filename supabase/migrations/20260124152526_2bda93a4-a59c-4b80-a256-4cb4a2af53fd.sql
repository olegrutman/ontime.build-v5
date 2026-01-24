-- Create function to search existing organizations and users for project team
CREATE OR REPLACE FUNCTION public.search_existing_team_targets(
  _query TEXT,
  _project_id UUID,
  _limit INT DEFAULT 10
)
RETURNS TABLE (
  result_type TEXT,
  org_id UUID,
  org_name TEXT,
  org_type TEXT,
  org_trade TEXT,
  contact_user_id UUID,
  contact_name TEXT,
  contact_email TEXT,
  city_state TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    'organization'::TEXT AS result_type,
    o.id AS org_id,
    o.name AS org_name,
    o.type::TEXT AS org_type,
    o.trade AS org_trade,
    p.user_id AS contact_user_id,
    p.full_name AS contact_name,
    p.email AS contact_email,
    CASE 
      WHEN o.address IS NOT NULL AND o.address->>'city' IS NOT NULL 
      THEN CONCAT(o.address->>'city', ', ', o.address->>'state')
      ELSE NULL
    END AS city_state
  FROM organizations o
  LEFT JOIN user_org_roles uor ON uor.organization_id = o.id
  LEFT JOIN profiles p ON p.user_id = uor.user_id
  WHERE 
    -- Search matches
    (
      o.name ILIKE '%' || _query || '%'
      OR p.full_name ILIKE '%' || _query || '%'
      OR p.email ILIKE '%' || _query || '%'
    )
    -- Exclude organizations already on this project
    AND o.id NOT IN (
      SELECT pt.org_id 
      FROM project_team pt 
      WHERE pt.project_id = _project_id 
      AND pt.org_id IS NOT NULL
    )
    -- Exclude organizations with pending invites for this project (by email)
    AND NOT EXISTS (
      SELECT 1 
      FROM project_invites pi 
      WHERE pi.project_id = _project_id 
      AND pi.status = 'Invited'
      AND p.email IS NOT NULL
      AND pi.invited_email = p.email
    )
  ORDER BY o.name
  LIMIT _limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.search_existing_team_targets(TEXT, UUID, INT) TO authenticated;