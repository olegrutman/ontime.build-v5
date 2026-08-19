REVOKE ALL ON FUNCTION public.sync_co_sov_on_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_co_sov_on_status() TO service_role;