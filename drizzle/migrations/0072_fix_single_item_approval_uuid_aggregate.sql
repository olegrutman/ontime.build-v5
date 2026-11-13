CREATE OR REPLACE FUNCTION public.sync_single_item_co_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_count integer; v_item uuid;
BEGIN
  IF OLD.status = 'submitted' AND NEW.status IN ('approved','rejected')
     AND current_setting('app.co_item_finalization', true) IS DISTINCT FROM 'on' THEN
    SELECT count(*), (array_agg(id))[1] INTO v_count, v_item FROM public.co_line_items WHERE co_id = NEW.id;
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