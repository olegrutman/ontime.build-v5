CREATE OR REPLACE FUNCTION public.sync_order_correction_approval() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status IN ('approved','contracted') AND OLD.status NOT IN ('approved','contracted') THEN
 UPDATE public.co_corrections SET approved_version=version,state='clean',decided_at=now() WHERE co_id=NEW.id AND from_org_id=NEW.org_id AND revision_id IS NULL;
 END IF;
 IF NEW.crew_approved_at IS NOT NULL AND OLD.crew_approved_at IS DISTINCT FROM NEW.crew_approved_at THEN
 UPDATE public.co_corrections x SET approved_version=version,state='clean',decided_at=now() WHERE x.co_id=NEW.id AND x.revision_id IS NULL AND EXISTS(SELECT 1 FROM public.organizations o WHERE o.id=x.from_org_id AND o.type='FC');
 END IF;
 RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.sync_order_correction_approval() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER z_sync_order_correction_approval AFTER UPDATE OF status,crew_approved_at ON public.change_orders FOR EACH ROW EXECUTE FUNCTION public.sync_order_correction_approval();