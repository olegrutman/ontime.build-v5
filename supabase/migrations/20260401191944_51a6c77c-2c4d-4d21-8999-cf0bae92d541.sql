
-- Create platform_settings table
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Security definer function to check platform role
CREATE OR REPLACE FUNCTION public.is_platform_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_users
    WHERE user_id = _user_id
      AND platform_role IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN')
      AND two_factor_verified = true
  );
$$;

-- RLS policies
CREATE POLICY "Platform staff can view settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can insert settings"
  ON public.platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can update settings"
  ON public.platform_settings FOR UPDATE
  TO authenticated
  USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can delete settings"
  ON public.platform_settings FOR DELETE
  TO authenticated
  USING (public.is_platform_staff(auth.uid()));

-- Auto-update timestamp
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
