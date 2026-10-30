CREATE OR REPLACE FUNCTION public.sync_order_correction_approval() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status IN ('approved','contracted') AND OLD.status NOT IN ('approved','contracted') THEN
 UPDATE public.co_corrections SET approved_version=version,state='clean',decided_at=now()
  WHERE co_id=NEW.id AND revision_id IS NULL AND from_org_id IN (NEW.org_id, NEW.assigned_to_org_id);
 END IF;
 IF NEW.crew_approved_at IS NOT NULL AND OLD.crew_approved_at IS DISTINCT FROM NEW.crew_approved_at THEN
 UPDATE public.co_corrections x SET approved_version=version,state='clean',decided_at=now() WHERE x.co_id=NEW.id AND x.revision_id IS NULL AND EXISTS(SELECT 1 FROM public.organizations o WHERE o.id=x.from_org_id AND o.type='FC');
 END IF;
 RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.sync_order_correction_approval() FROM PUBLIC,anon,authenticated;
UPDATE public.co_corrections x SET approved_version=x.version,state='clean',decided_at=now()
 FROM public.change_orders c
 WHERE c.id=x.co_id AND x.revision_id IS NULL AND x.state='needs_correction' AND c.status IN ('approved','contracted')
  AND x.from_org_id=c.assigned_to_org_id AND x.version>x.approved_version
  AND c.approved_at IS NOT NULL AND x.changed_at <= c.approved_at;