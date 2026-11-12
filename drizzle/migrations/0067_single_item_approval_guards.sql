CREATE OR REPLACE FUNCTION public.guard_co_line_decision_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.co_line_decision', true) IS DISTINCT FROM 'on' THEN
    IF TG_OP = 'INSERT' AND (NEW.approval_status <> 'pending' OR NEW.approval_rejection_reason IS NOT NULL
       OR NEW.approval_decided_by IS NOT NULL OR NEW.approval_decided_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Item approval fields can only be changed through item review';
    ELSIF TG_OP = 'UPDATE' AND (NEW.approval_status IS DISTINCT FROM OLD.approval_status
       OR NEW.approval_rejection_reason IS DISTINCT FROM OLD.approval_rejection_reason
       OR NEW.approval_decided_by IS DISTINCT FROM OLD.approval_decided_by
       OR NEW.approval_decided_at IS DISTINCT FROM OLD.approval_decided_at) THEN
      RAISE EXCEPTION 'Item approval fields can only be changed through item review';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_multi_item_co_finalization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'submitted' AND NEW.status IN ('approved','rejected')
     AND current_setting('app.co_item_finalization', true) IS DISTINCT FROM 'on'
     AND (SELECT count(*) FROM public.co_line_items WHERE co_id = NEW.id) > 1 THEN
    RAISE EXCEPTION 'Review each scope item before finalizing this order';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_single_item_co_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_count integer; v_item uuid;
BEGIN
  IF OLD.status = 'submitted' AND NEW.status IN ('approved','rejected')
     AND current_setting('app.co_item_finalization', true) IS DISTINCT FROM 'on' THEN
    SELECT count(*), min(id) INTO v_count, v_item FROM public.co_line_items WHERE co_id = NEW.id;
    IF v_count = 1 THEN
      NEW.approved_amount := CASE WHEN NEW.status = 'approved' THEN public.co_proposed_total(NEW.id) ELSE 0 END;
      PERFORM set_config('app.skip_co_correction', 'on', true);
      PERFORM set_config('app.co_line_decision', 'on', true);
      UPDATE public.co_line_items
      SET approval_status = NEW.status,
          approval_rejection_reason = CASE WHEN NEW.status = 'rejected' THEN COALESCE(NULLIF(btrim(NEW.rejection_note), ''), 'Rejected') ELSE NULL END,
          approval_decided_by = auth.uid(), approval_decided_at = now()
      WHERE id = v_item;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER sync_single_item_co_approval
BEFORE UPDATE OF status ON public.change_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_single_item_co_approval();