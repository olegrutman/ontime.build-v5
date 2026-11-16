
CREATE TABLE public.field_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  crew_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reviewer_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT current_date,
  raw_text text,
  transcript text,
  audio_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (crew_org_id <> reviewer_org_id)
);
CREATE INDEX field_reports_project_idx ON public.field_reports(project_id, report_date DESC);
CREATE INDEX field_reports_crew_idx ON public.field_reports(crew_org_id);
CREATE INDEX field_reports_reviewer_idx ON public.field_reports(reviewer_org_id);

CREATE TABLE public.field_report_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.field_reports(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  crew_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reviewer_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('progress','material','extra_work','blocker','hours')),
  description text NOT NULL CHECK (length(btrim(description)) > 0),
  location text,
  quantity numeric,
  unit text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','crew_confirmed','reviewed','released','held','converted')),
  hold_reason text,
  ai_generated boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz, confirmed_by uuid,
  reviewed_at timestamptz, reviewed_by uuid,
  released_at timestamptz, released_by uuid,
  converted_co_id uuid REFERENCES public.change_orders(id) ON DELETE SET NULL,
  converted_po_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX field_report_items_report_idx ON public.field_report_items(report_id);
CREATE INDEX field_report_items_project_status_idx ON public.field_report_items(project_id, status);
CREATE INDEX field_report_items_co_idx ON public.field_report_items(converted_co_id);
CREATE INDEX field_report_items_po_idx ON public.field_report_items(converted_po_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_report_items TO authenticated;
GRANT ALL ON public.field_reports TO service_role;
GRANT ALL ON public.field_report_items TO service_role;

ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_report_items ENABLE ROW LEVEL SECURITY;

-- Helpers (security definer to avoid policy recursion)
CREATE OR REPLACE FUNCTION public.field_report_party(_user uuid, _report uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.user_in_org(_user, r.crew_org_id) THEN 'crew'
    WHEN public.user_in_org(_user, r.reviewer_org_id) THEN 'reviewer'
    ELSE NULL END
  FROM public.field_reports r WHERE r.id = _report
$$;

CREATE OR REPLACE FUNCTION public.is_field_reviewer_pair(_project uuid, _crew uuid, _reviewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_contracts c
    WHERE c.project_id = _project AND c.from_org_id = _crew AND c.to_org_id = _reviewer)
$$;

-- Report policies
CREATE POLICY field_reports_select ON public.field_reports FOR SELECT TO authenticated
  USING ((public.user_in_org(auth.uid(), crew_org_id) OR public.user_in_org(auth.uid(), reviewer_org_id))
         AND public.can_see_project(project_id));
CREATE POLICY field_reports_insert ON public.field_reports FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND status = 'draft'
    AND public.user_in_org(auth.uid(), crew_org_id)
    AND public.can_see_project(project_id)
    AND public.is_field_reviewer_pair(project_id, crew_org_id, reviewer_org_id));
CREATE POLICY field_reports_update ON public.field_reports FOR UPDATE TO authenticated
  USING (status = 'draft' AND public.user_in_org(auth.uid(), crew_org_id))
  WITH CHECK (status = 'draft' AND public.user_in_org(auth.uid(), crew_org_id));
CREATE POLICY field_reports_delete ON public.field_reports FOR DELETE TO authenticated
  USING (status = 'draft' AND created_by = auth.uid());

-- Item policies
CREATE POLICY field_items_select_parties ON public.field_report_items FOR SELECT TO authenticated
  USING ((public.user_in_org(auth.uid(), crew_org_id) OR public.user_in_org(auth.uid(), reviewer_org_id))
         AND public.can_see_project(project_id));
CREATE POLICY field_items_select_released ON public.field_report_items FOR SELECT TO authenticated
  USING (status IN ('released','converted')
         AND public.is_project_participant(auth.uid(), project_id)
         AND public.can_see_project(project_id));
CREATE POLICY field_items_insert ON public.field_report_items FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND status = 'draft'
    AND public.field_report_party(auth.uid(), report_id) = 'crew'
    AND EXISTS (SELECT 1 FROM public.field_reports r WHERE r.id = report_id AND r.status = 'draft'
      AND r.project_id = field_report_items.project_id AND r.crew_org_id = field_report_items.crew_org_id
      AND r.reviewer_org_id = field_report_items.reviewer_org_id));
CREATE POLICY field_items_update ON public.field_report_items FOR UPDATE TO authenticated
  USING (status = 'draft' AND public.user_in_org(auth.uid(), crew_org_id))
  WITH CHECK (status = 'draft' AND public.user_in_org(auth.uid(), crew_org_id));
CREATE POLICY field_items_delete ON public.field_report_items FOR DELETE TO authenticated
  USING (status = 'draft' AND public.user_in_org(auth.uid(), crew_org_id));

-- Guard: workflow columns change only through the RPCs below
CREATE OR REPLACE FUNCTION public.guard_field_item_workflow()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF coalesce(current_setting('app.field_rpc', true), '') = 'on' THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.released_at IS DISTINCT FROM OLD.released_at
     OR NEW.released_by IS DISTINCT FROM OLD.released_by OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.confirmed_by IS DISTINCT FROM OLD.confirmed_by OR NEW.converted_co_id IS DISTINCT FROM OLD.converted_co_id
     OR NEW.converted_po_id IS DISTINCT FROM OLD.converted_po_id OR NEW.hold_reason IS DISTINCT FROM OLD.hold_reason
     OR NEW.report_id IS DISTINCT FROM OLD.report_id OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.crew_org_id IS DISTINCT FROM OLD.crew_org_id OR NEW.reviewer_org_id IS DISTINCT FROM OLD.reviewer_org_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Field item workflow fields can only change through review actions';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_field_item_workflow BEFORE UPDATE ON public.field_report_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_field_item_workflow();

CREATE OR REPLACE FUNCTION public.guard_field_report_workflow()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF coalesce(current_setting('app.field_rpc', true), '') = 'on' THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.crew_org_id IS DISTINCT FROM OLD.crew_org_id OR NEW.reviewer_org_id IS DISTINCT FROM OLD.reviewer_org_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    RAISE EXCEPTION 'Field report workflow fields can only change through review actions';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_field_report_workflow BEFORE UPDATE ON public.field_reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_field_report_workflow();

-- Crew submits report: confirms all draft items
CREATE OR REPLACE FUNCTION public.submit_field_report(p_report_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.field_reports;
BEGIN
  SELECT * INTO r FROM public.field_reports WHERE id = p_report_id FOR UPDATE;
  IF r.id IS NULL OR NOT public.user_in_org(auth.uid(), r.crew_org_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF r.status <> 'draft' THEN RAISE EXCEPTION 'Report already submitted'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.field_report_items WHERE report_id = r.id) THEN
    RAISE EXCEPTION 'Add at least one item before submitting'; END IF;
  PERFORM set_config('app.field_rpc', 'on', true);
  UPDATE public.field_report_items SET status = 'crew_confirmed', confirmed_at = now(), confirmed_by = auth.uid()
    WHERE report_id = r.id AND status = 'draft';
  UPDATE public.field_reports SET status = 'submitted', submitted_at = now() WHERE id = r.id;
  PERFORM set_config('app.field_rpc', 'off', true);
END $$;

-- Subcontractor decides one item: release | hold | reviewed
CREATE OR REPLACE FUNCTION public.decide_field_item(p_item_id uuid, p_decision text, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i public.field_report_items;
BEGIN
  SELECT * INTO i FROM public.field_report_items WHERE id = p_item_id FOR UPDATE;
  IF i.id IS NULL OR NOT public.user_in_org(auth.uid(), i.reviewer_org_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF i.status NOT IN ('crew_confirmed','reviewed','held') THEN RAISE EXCEPTION 'Item cannot be decided in status %', i.status; END IF;
  IF p_decision = 'hold' AND coalesce(btrim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required to hold an item'; END IF;
  PERFORM set_config('app.field_rpc', 'on', true);
  IF p_decision = 'release' THEN
    UPDATE public.field_report_items SET status = 'released', released_at = now(), released_by = auth.uid(),
      reviewed_at = coalesce(reviewed_at, now()), reviewed_by = coalesce(reviewed_by, auth.uid()), hold_reason = NULL
      WHERE id = i.id;
  ELSIF p_decision = 'hold' THEN
    UPDATE public.field_report_items SET status = 'held', hold_reason = p_reason, reviewed_at = now(), reviewed_by = auth.uid()
      WHERE id = i.id;
  ELSIF p_decision = 'reviewed' THEN
    UPDATE public.field_report_items SET status = 'reviewed', reviewed_at = now(), reviewed_by = auth.uid(), hold_reason = NULL
      WHERE id = i.id;
  ELSE
    RAISE EXCEPTION 'Unknown decision %', p_decision;
  END IF;
  UPDATE public.field_reports SET status = 'reviewed'
    WHERE id = i.report_id AND NOT EXISTS (SELECT 1 FROM public.field_report_items
      WHERE report_id = i.report_id AND status IN ('draft','crew_confirmed'));
  PERFORM set_config('app.field_rpc', 'off', true);
END $$;

-- Subcontractor links item to an order it created (one conversion per item)
CREATE OR REPLACE FUNCTION public.link_field_item_conversion(p_item_id uuid, p_co_id uuid DEFAULT NULL, p_po_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i public.field_report_items;
BEGIN
  IF (p_co_id IS NULL) = (p_po_id IS NULL) THEN RAISE EXCEPTION 'Provide exactly one order'; END IF;
  SELECT * INTO i FROM public.field_report_items WHERE id = p_item_id FOR UPDATE;
  IF i.id IS NULL OR NOT public.user_in_org(auth.uid(), i.reviewer_org_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF i.status = 'converted' THEN RAISE EXCEPTION 'Item already converted'; END IF;
  IF i.status NOT IN ('crew_confirmed','reviewed','released','held') THEN RAISE EXCEPTION 'Item not ready'; END IF;
  IF p_co_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.change_orders WHERE id = p_co_id AND project_id = i.project_id) THEN
    RAISE EXCEPTION 'Order not on this project'; END IF;
  IF p_po_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.purchase_orders WHERE id = p_po_id AND project_id = i.project_id) THEN
    RAISE EXCEPTION 'Order not on this project'; END IF;
  PERFORM set_config('app.field_rpc', 'on', true);
  UPDATE public.field_report_items SET status = 'converted', converted_co_id = p_co_id, converted_po_id = p_po_id,
    reviewed_at = coalesce(reviewed_at, now()), reviewed_by = coalesce(reviewed_by, auth.uid())
    WHERE id = i.id;
  PERFORM set_config('app.field_rpc', 'off', true);
END $$;

REVOKE ALL ON FUNCTION public.submit_field_report(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.decide_field_item(uuid, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.link_field_item_conversion(uuid, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_field_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_field_item(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_field_item_conversion(uuid, uuid, uuid) TO authenticated;

-- Private voice storage: path = <report_id>/<file>
CREATE POLICY field_audio_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'field-audio'
    AND public.field_report_party(auth.uid(), (storage.foldername(name))[1]::uuid) IS NOT NULL);
CREATE POLICY field_audio_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'field-audio'
    AND public.field_report_party(auth.uid(), (storage.foldername(name))[1]::uuid) = 'crew');
CREATE POLICY field_audio_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'field-audio' AND owner = auth.uid());
