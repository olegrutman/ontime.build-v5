REVOKE ALL ON FUNCTION public.build_co_sov(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.build_co_sov(uuid) TO service_role;