REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (id, user_id, email, full_name, first_name, last_name, phone,
  preferred_contact_method, timezone, language, job_title, view_preference,
  address, created_at, updated_at) ON public.profiles TO authenticated;