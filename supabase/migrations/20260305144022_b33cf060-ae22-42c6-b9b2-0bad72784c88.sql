-- Organizations: platform users can view all
CREATE POLICY "Platform users can view all organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (is_platform_user(auth.uid()));

-- Profiles: platform users can view all
CREATE POLICY "Platform users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_platform_user(auth.uid()));

-- Projects: platform users can view all
CREATE POLICY "Platform users can view all projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (is_platform_user(auth.uid()));