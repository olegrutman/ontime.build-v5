CREATE OR REPLACE FUNCTION public._skip_system_co_correction() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
 IF auth.uid() IS NULL AND NEW.changed_by IS NULL AND NEW.state='needs_correction' THEN
   IF TG_OP='INSERT' THEN RETURN NULL; END IF;
   RETURN OLD;
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS skip_system_co_correction ON public.co_corrections;
CREATE TRIGGER skip_system_co_correction BEFORE INSERT OR UPDATE ON public.co_corrections FOR EACH ROW EXECUTE FUNCTION public._skip_system_co_correction();

UPDATE public.co_corrections x SET state='clean', approved_version=x.version, decided_at=now()
FROM public.change_orders c
WHERE c.id=x.co_id AND x.state='needs_correction'
 AND (x.changed_by IS NULL OR (c.approved_at IS NOT NULL AND x.changed_at < c.approved_at))
 AND NOT EXISTS (SELECT 1 FROM public.co_price_revisions r WHERE r.co_id=x.co_id AND r.status='pending');