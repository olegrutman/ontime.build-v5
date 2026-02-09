
-- Accept org invitation (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.accept_org_invitation(p_invitation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_org_id UUID;
  v_role app_role;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_caller_email TEXT;
BEGIN
  -- Get caller's email
  SELECT email INTO v_caller_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_caller_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch invitation details
  SELECT email, organization_id, role, status, expires_at
  INTO v_email, v_org_id, v_role, v_status, v_expires_at
  FROM org_invitations
  WHERE id = p_invitation_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  -- Validate caller's email matches
  IF lower(v_caller_email) <> lower(v_email) THEN
    RAISE EXCEPTION 'This invitation is not for your email address';
  END IF;

  -- Check status
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending';
  END IF;

  -- Check expiration
  IF v_expires_at < now() THEN
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  -- Insert user_org_role
  INSERT INTO user_org_roles (user_id, organization_id, role)
  VALUES (auth.uid(), v_org_id, v_role)
  ON CONFLICT DO NOTHING;

  -- Mark invitation as accepted
  UPDATE org_invitations
  SET status = 'accepted'
  WHERE id = p_invitation_id;
END;
$$;

-- Decline org invitation
CREATE OR REPLACE FUNCTION public.decline_org_invitation(p_invitation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_caller_email TEXT;
BEGIN
  -- Get caller's email
  SELECT email INTO v_caller_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_caller_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch invitation email
  SELECT email INTO v_email
  FROM org_invitations
  WHERE id = p_invitation_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF lower(v_caller_email) <> lower(v_email) THEN
    RAISE EXCEPTION 'This invitation is not for your email address';
  END IF;

  UPDATE org_invitations
  SET status = 'expired'
  WHERE id = p_invitation_id
    AND status = 'pending';
END;
$$;

-- Allow any authenticated user to SELECT org_invitations where email matches theirs
-- (needed for the dashboard banner to query pending invites)
CREATE POLICY "Users can view their own invitations"
ON public.org_invitations
FOR SELECT
TO authenticated
USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));
