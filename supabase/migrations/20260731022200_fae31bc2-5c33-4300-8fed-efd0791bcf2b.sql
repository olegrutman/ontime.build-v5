ALTER TABLE public._phase3e_policy_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._phase3e_policy_backup FROM anon, authenticated;
GRANT ALL ON public._phase3e_policy_backup TO service_role;