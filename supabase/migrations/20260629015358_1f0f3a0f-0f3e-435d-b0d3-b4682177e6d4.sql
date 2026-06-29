REVOKE ALL ON FUNCTION public.can_delete_change_order(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_delete_change_order(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_delete_change_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_change_order(uuid, uuid) TO service_role;