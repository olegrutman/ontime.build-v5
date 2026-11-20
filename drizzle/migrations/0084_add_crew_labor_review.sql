ALTER TABLE public.co_labor_entries
  ADD COLUMN crew_review_status text,
  ADD COLUMN crew_reviewed_by_user_id uuid,
  ADD COLUMN crew_reviewed_at timestamptz,
  ADD COLUMN crew_rejection_note text;

ALTER TABLE public.co_labor_entries
  ADD CONSTRAINT co_labor_entries_crew_review_status_check
  CHECK (crew_review_status IS NULL OR crew_review_status IN ('pending', 'approved', 'rejected'));

COMMENT ON COLUMN public.co_labor_entries.crew_review_status IS 'NULL is a legacy unreviewed entry; new crew billable entries start pending.';

CREATE OR REPLACE FUNCTION public.protect_crew_labor_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  content_changed boolean := false;
  review_changed boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    content_changed :=
      NEW.co_line_item_id IS DISTINCT FROM OLD.co_line_item_id OR
      NEW.org_id IS DISTINCT FROM OLD.org_id OR
      NEW.entered_by_role IS DISTINCT FROM OLD.entered_by_role OR
      NEW.entry_date IS DISTINCT FROM OLD.entry_date OR
      NEW.pricing_mode IS DISTINCT FROM OLD.pricing_mode OR
      NEW.hours IS DISTINCT FROM OLD.hours OR
      NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate OR
      NEW.lump_sum IS DISTINCT FROM OLD.lump_sum OR
      NEW.line_total IS DISTINCT FROM OLD.line_total OR
      NEW.description IS DISTINCT FROM OLD.description OR
      NEW.is_actual_cost IS DISTINCT FROM OLD.is_actual_cost OR
      NEW.base_hourly_rate IS DISTINCT FROM OLD.base_hourly_rate OR
      NEW.base_lump_sum IS DISTINCT FROM OLD.base_lump_sum OR
      NEW.markup_percent IS DISTINCT FROM OLD.markup_percent OR
      NEW.crew_size IS DISTINCT FROM OLD.crew_size OR
      NEW.days IS DISTINCT FROM OLD.days OR
      NEW.hours_per_day IS DISTINCT FROM OLD.hours_per_day;
    review_changed :=
      NEW.crew_review_status IS DISTINCT FROM OLD.crew_review_status OR
      NEW.crew_reviewed_by_user_id IS DISTINCT FROM OLD.crew_reviewed_by_user_id OR
      NEW.crew_reviewed_at IS DISTINCT FROM OLD.crew_reviewed_at OR
      NEW.crew_rejection_note IS DISTINCT FROM OLD.crew_rejection_note;
  END IF;

  IF NEW.entered_by_role = 'FC' AND NOT NEW.is_actual_cost THEN
    IF TG_OP = 'INSERT' OR content_changed THEN
      NEW.crew_review_status := 'pending';
      NEW.crew_reviewed_by_user_id := NULL;
      NEW.crew_reviewed_at := NULL;
      NEW.crew_rejection_note := NULL;
    ELSIF review_changed AND current_setting('app.crew_labor_review', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'Crew labor review decisions require the authorized review action';
    END IF;
  ELSE
    NEW.crew_review_status := NULL;
    NEW.crew_reviewed_by_user_id := NULL;
    NEW.crew_reviewed_at := NULL;
    NEW.crew_rejection_note := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER co_labor_entries_crew_review_guard
BEFORE INSERT OR UPDATE ON public.co_labor_entries
FOR EACH ROW EXECUTE FUNCTION public.protect_crew_labor_review();

CREATE OR REPLACE FUNCTION public.review_fc_labor_entry(
  _entry_id uuid,
  _decision text,
  _note text DEFAULT NULL
)
RETURNS public.co_labor_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _entry public.co_labor_entries;
  _co public.change_orders;
  _biller uuid;
  _org_type text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
  END IF;
  IF _decision = 'rejected' AND NULLIF(btrim(COALESCE(_note, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Explain why these crew hours are rejected';
  END IF;

  SELECT * INTO _entry FROM public.co_labor_entries WHERE id = _entry_id FOR UPDATE;
  IF _entry.id IS NULL OR _entry.entered_by_role <> 'FC' OR _entry.is_actual_cost THEN
    RAISE EXCEPTION 'Crew billing entry not found';
  END IF;

  SELECT * INTO _co FROM public.change_orders WHERE id = _entry.co_id;
  _biller := CASE
    WHEN _co.created_by_role = 'FC'
      AND (_co.originating_org_id IS NULL OR _co.originating_org_id = _co.org_id)
      AND _co.assigned_to_org_id IS NOT NULL
      AND _co.assigned_to_org_id <> _co.org_id
    THEN _co.assigned_to_org_id
    ELSE _co.org_id
  END;

  SELECT type INTO _org_type FROM public.organizations WHERE id = _biller;
  IF _biller IS NULL OR _org_type <> 'TC'
    OR NOT public.user_in_org(auth.uid(), _biller)
    OR NOT public.is_project_participant(auth.uid(), _co.project_id) THEN
    RAISE EXCEPTION 'Only the subcontractor billing this order can review crew hours';
  END IF;

  PERFORM set_config('app.crew_labor_review', 'on', true);
  UPDATE public.co_labor_entries
  SET crew_review_status = _decision,
      crew_reviewed_by_user_id = auth.uid(),
      crew_reviewed_at = now(),
      crew_rejection_note = CASE WHEN _decision = 'rejected' THEN btrim(_note) ELSE NULL END
  WHERE id = _entry_id
  RETURNING * INTO _entry;

  RETURN _entry;
END;
$function$;

REVOKE ALL ON FUNCTION public.review_fc_labor_entry(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_fc_labor_entry(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_fc_labor_entry(uuid, text, text) TO service_role;

CREATE OR REPLACE VIEW public.co_labor_entries_role_view AS
SELECT id, co_id, co_line_item_id, org_id, entered_by_role, entry_date,
  pricing_mode, hours, hourly_rate, lump_sum, line_total,
  CASE WHEN co_viewer_role(co_id) = 'gc'::text AND lower(entered_by_role) <> 'gc'::text THEN NULL::numeric ELSE base_hourly_rate END AS base_hourly_rate,
  CASE WHEN co_viewer_role(co_id) = 'gc'::text AND lower(entered_by_role) <> 'gc'::text THEN NULL::numeric ELSE base_lump_sum END AS base_lump_sum,
  CASE WHEN co_viewer_role(co_id) = 'gc'::text AND lower(entered_by_role) <> 'gc'::text THEN NULL::numeric ELSE markup_percent END AS markup_percent,
  source_fc_entry_ids, description, is_actual_cost, actual_cost_note, created_at,
  gc_approved, gc_approved_at, crew_size, days, hours_per_day,
  crew_review_status, crew_reviewed_by_user_id, crew_reviewed_at, crew_rejection_note
FROM public.co_labor_entries l;