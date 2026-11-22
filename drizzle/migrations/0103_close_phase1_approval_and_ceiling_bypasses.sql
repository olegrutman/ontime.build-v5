CREATE OR REPLACE FUNCTION public.guard_co_nte_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF NEW.pricing_type = 'nte'
     AND NEW.status IN ('submitted', 'approved', 'contracted')
     AND (NEW.nte_cap IS NULL OR NEW.nte_cap <= 0) THEN
    RAISE EXCEPTION 'Set a Not-to-exceed ceiling greater than zero before submission or approval';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_co_nte_lifecycle ON public.change_orders;
CREATE TRIGGER guard_co_nte_lifecycle
BEFORE UPDATE OF status, nte_cap ON public.change_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_co_nte_lifecycle();

CREATE OR REPLACE FUNCTION public.guard_gc_atomic_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND OLD.status = 'submitted' AND NEW.status = 'approved'
     AND EXISTS (
       SELECT 1 FROM public.organizations o
       WHERE o.id = OLD.assigned_to_org_id AND o.type = 'GC'
     )
     AND COALESCE(current_setting('app.skip_co_correction', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Use the protected General Contractor approval action' USING errcode = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_gc_atomic_approval ON public.change_orders;
CREATE TRIGGER guard_gc_atomic_approval
BEFORE UPDATE OF status ON public.change_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_gc_atomic_approval();

REVOKE ALL ON FUNCTION public.finalize_co_line_review(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_co_line_review(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.approve_co_nte_increase(_co_id uuid, _nte_log_id uuid)
RETURNS public.change_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  c public.change_orders;
  l public.co_nte_log;
  v_new_cap numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized' USING errcode = '42501'; END IF;
  SELECT * INTO c FROM public.change_orders WHERE id = _co_id FOR UPDATE;
  IF c.id IS NULL OR NOT public.can_see_project(c.project_id) THEN
    RAISE EXCEPTION 'Change order not found' USING errcode = '42501';
  END IF;
  IF c.assigned_to_org_id IS NULL
     OR NOT public.user_in_org(auth.uid(), c.assigned_to_org_id)
     OR NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = c.assigned_to_org_id AND o.type = 'GC') THEN
    RAISE EXCEPTION 'Only the assigned General Contractor can approve a ceiling increase' USING errcode = '42501';
  END IF;
  IF c.pricing_type <> 'nte' OR c.nte_cap IS NULL OR c.nte_cap <= 0 THEN
    RAISE EXCEPTION 'A positive Not-to-exceed ceiling is required';
  END IF;

  SELECT * INTO l FROM public.co_nte_log WHERE id = _nte_log_id AND co_id = c.id FOR UPDATE;
  IF l.id IS NULL THEN RAISE EXCEPTION 'Ceiling-increase request not found'; END IF;
  IF l.approved_at IS NOT NULL AND l.new_cap_after_approval = c.nte_cap AND COALESCE(c.nte_increase_approved, false) THEN
    RETURN c;
  END IF;
  IF l.approved_at IS NOT NULL OR l.rejected_at IS NOT NULL THEN
    RAISE EXCEPTION 'This ceiling-increase request has already been decided';
  END IF;
  IF l.requested_increase IS NULL OR l.requested_increase <= 0 THEN
    RAISE EXCEPTION 'The requested ceiling increase must be greater than zero';
  END IF;

  v_new_cap := round(c.nte_cap + l.requested_increase, 2);
  PERFORM set_config('app.skip_co_correction', 'on', true);
  UPDATE public.change_orders
  SET nte_cap = v_new_cap, nte_increase_requested = NULL,
      nte_increase_approved = true, updated_at = now()
  WHERE id = c.id
  RETURNING * INTO c;
  UPDATE public.co_nte_log
  SET approved_by_user_id = auth.uid(), approved_at = now(), new_cap_after_approval = v_new_cap
  WHERE id = l.id;
  RETURN c;
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_co_nte_increase(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_co_nte_increase(uuid, uuid) TO authenticated;