
-- Phase 1: Platform Admin Portal data model

-- 1. Enum for platform roles
CREATE TYPE public.platform_role AS ENUM ('NONE', 'PLATFORM_OWNER', 'PLATFORM_ADMIN', 'SUPPORT_AGENT');

-- 2. Platform users table (separate from profiles)
CREATE TABLE public.platform_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  platform_role public.platform_role NOT NULL DEFAULT 'NONE',
  two_factor_verified boolean NOT NULL DEFAULT false,
  last_impersonation_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Support actions log (append-only audit trail)
CREATE TABLE public.support_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_by_name text,
  created_by_email text,
  target_org_id uuid,
  target_org_name text,
  target_project_id uuid,
  target_project_name text,
  target_user_id uuid,
  target_user_email text,
  action_type text NOT NULL,
  action_summary text,
  reason text NOT NULL,
  before_snapshot jsonb,
  after_snapshot jsonb
);

-- 4. Enable RLS
ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_actions_log ENABLE ROW LEVEL SECURITY;

-- 5. SECURITY DEFINER function: get platform role for a user
CREATE OR REPLACE FUNCTION public.get_platform_role(_user_id uuid)
RETURNS public.platform_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT platform_role FROM public.platform_users WHERE user_id = _user_id),
    'NONE'::public.platform_role
  );
$$;

-- 6. SECURITY DEFINER helper: is the caller a platform user?
CREATE OR REPLACE FUNCTION public.is_platform_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_users
    WHERE user_id = _user_id
    AND platform_role != 'NONE'
  );
$$;

-- 7. RLS policies for platform_users
CREATE POLICY "Platform users can view platform_users"
  ON public.platform_users FOR SELECT
  TO authenticated
  USING (public.is_platform_user(auth.uid()));

-- No INSERT/UPDATE/DELETE policies — managed via RPCs only

-- 8. RLS policies for support_actions_log
CREATE POLICY "Platform users can view support logs"
  ON public.support_actions_log FOR SELECT
  TO authenticated
  USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can insert support logs"
  ON public.support_actions_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_user(auth.uid()));

-- No UPDATE or DELETE policies (append-only)

-- 9. SECURITY DEFINER function: log a support action
CREATE OR REPLACE FUNCTION public.log_support_action(
  p_target_org_id uuid DEFAULT NULL,
  p_target_org_name text DEFAULT NULL,
  p_target_project_id uuid DEFAULT NULL,
  p_target_project_name text DEFAULT NULL,
  p_target_user_id uuid DEFAULT NULL,
  p_target_user_email text DEFAULT NULL,
  p_action_type text DEFAULT NULL,
  p_action_summary text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_before_snapshot jsonb DEFAULT NULL,
  p_after_snapshot jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_name text;
  v_caller_email text;
  v_log_id uuid;
BEGIN
  -- Verify caller is a platform user
  IF NOT public.is_platform_user(v_caller_id) THEN
    RAISE EXCEPTION 'Access denied: not a platform user';
  END IF;

  -- Get caller info from profiles
  SELECT full_name, email INTO v_caller_name, v_caller_email
  FROM public.profiles WHERE user_id = v_caller_id;

  INSERT INTO public.support_actions_log (
    created_by_user_id, created_by_name, created_by_email,
    target_org_id, target_org_name, target_project_id, target_project_name,
    target_user_id, target_user_email,
    action_type, action_summary, reason,
    before_snapshot, after_snapshot
  ) VALUES (
    v_caller_id, v_caller_name, v_caller_email,
    p_target_org_id, p_target_org_name, p_target_project_id, p_target_project_name,
    p_target_user_id, p_target_user_email,
    p_action_type, p_action_summary, p_reason,
    p_before_snapshot, p_after_snapshot
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;
