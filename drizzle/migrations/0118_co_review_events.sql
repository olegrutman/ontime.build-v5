CREATE TABLE public.co_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  co_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  agreement text NOT NULL CHECK (agreement IN ('upstream','crew')),
  subject_label text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','rejected','pending')),
  reason text,
  decided_by_user_id uuid,
  decided_by_name text,
  decided_by_org_name text,
  party_org_ids uuid[] NOT NULL DEFAULT '{}',
  decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX co_review_events_co_idx ON public.co_review_events (co_id, decided_at DESC);
CREATE INDEX co_review_events_parties_idx ON public.co_review_events USING gin (party_org_ids);
GRANT SELECT ON public.co_review_events TO authenticated;
GRANT ALL ON public.co_review_events TO service_role;
ALTER TABLE public.co_review_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agreement parties read review history" ON public.co_review_events
  FOR SELECT TO authenticated
  USING (party_org_ids && ARRAY(SELECT organization_id FROM public.user_org_roles WHERE user_id = (SELECT auth.uid())));

CREATE OR REPLACE FUNCTION public._review_actor(_uid uuid, OUT actor_name text, OUT actor_org uuid, OUT actor_org_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(p.full_name,''), NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)),''), 'Someone'),
         r.organization_id, o.name
  FROM (SELECT _uid AS uid) x
  LEFT JOIN public.profiles p ON p.user_id = x.uid
  LEFT JOIN LATERAL (SELECT organization_id FROM public.user_org_roles WHERE user_id = x.uid ORDER BY created_at LIMIT 1) r ON true
  LEFT JOIN public.organizations o ON o.id = r.organization_id
$$;
REVOKE EXECUTE ON FUNCTION public._review_actor(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_co_line_review_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; c record; v_uid uuid;
BEGIN
  IF NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status
     AND NEW.approval_rejection_reason IS NOT DISTINCT FROM OLD.approval_rejection_reason THEN RETURN NEW; END IF;
  IF NEW.approval_status NOT IN ('approved','rejected') THEN RETURN NEW; END IF;
  v_uid := COALESCE(NEW.approval_decided_by, auth.uid());
  SELECT * INTO a FROM public._review_actor(v_uid);
  SELECT org_id, assigned_to_org_id INTO c FROM public.change_orders WHERE id = NEW.co_id;
  INSERT INTO public.co_review_events (co_id, agreement, subject_label, decision, reason, decided_by_user_id, decided_by_name, decided_by_org_name, party_org_ids, decided_at)
  VALUES (NEW.co_id, 'upstream', NEW.item_name, NEW.approval_status, NEW.approval_rejection_reason, v_uid, a.actor_name, a.actor_org_name,
          array_remove(ARRAY[c.org_id, c.assigned_to_org_id], NULL), COALESCE(NEW.approval_decided_at, now()));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_log_co_line_review_event AFTER UPDATE OF approval_status, approval_rejection_reason ON public.co_line_items
  FOR EACH ROW EXECUTE FUNCTION public.log_co_line_review_event();

CREATE OR REPLACE FUNCTION public.log_crew_entry_review_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; v_uid uuid; v_item text;
BEGIN
  IF NEW.crew_review_status IS NOT DISTINCT FROM OLD.crew_review_status
     AND NEW.crew_rejection_note IS NOT DISTINCT FROM OLD.crew_rejection_note THEN RETURN NEW; END IF;
  IF NEW.crew_review_status NOT IN ('approved','rejected') THEN RETURN NEW; END IF;
  v_uid := COALESCE(NEW.crew_reviewed_by_user_id, auth.uid());
  SELECT * INTO a FROM public._review_actor(v_uid);
  SELECT item_name INTO v_item FROM public.co_line_items WHERE id = NEW.co_line_item_id;
  INSERT INTO public.co_review_events (co_id, agreement, subject_label, decision, reason, decided_by_user_id, decided_by_name, decided_by_org_name, party_org_ids, decided_at)
  VALUES (NEW.co_id, 'crew', concat_ws(' · ', COALESCE(v_item,'Scope item'), NEW.entry_date::text, NULLIF(NEW.description,'')),
          NEW.crew_review_status, NEW.crew_rejection_note, v_uid, a.actor_name, a.actor_org_name,
          array_remove(ARRAY[NEW.org_id, a.actor_org], NULL), COALESCE(NEW.crew_reviewed_at, now()));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_log_crew_entry_review_event AFTER UPDATE OF crew_review_status, crew_rejection_note ON public.co_labor_entries
  FOR EACH ROW EXECUTE FUNCTION public.log_crew_entry_review_event();
REVOKE EXECUTE ON FUNCTION public.log_co_line_review_event() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_crew_entry_review_event() FROM public, anon, authenticated;

-- Starting history from decisions already recorded
INSERT INTO public.co_review_events (co_id, agreement, subject_label, decision, reason, decided_by_user_id, decided_by_name, decided_by_org_name, party_org_ids, decided_at)
SELECT li.co_id, 'upstream', li.item_name, li.approval_status, li.approval_rejection_reason, li.approval_decided_by, a.actor_name, a.actor_org_name,
       array_remove(ARRAY[c.org_id, c.assigned_to_org_id], NULL), li.approval_decided_at
FROM public.co_line_items li JOIN public.change_orders c ON c.id = li.co_id
CROSS JOIN LATERAL public._review_actor(li.approval_decided_by) a
WHERE li.approval_status IN ('approved','rejected') AND li.approval_decided_at IS NOT NULL;

INSERT INTO public.co_review_events (co_id, agreement, subject_label, decision, reason, decided_by_user_id, decided_by_name, decided_by_org_name, party_org_ids, decided_at)
SELECT e.co_id, 'crew', concat_ws(' · ', COALESCE(li.item_name,'Scope item'), e.entry_date::text, NULLIF(e.description,'')),
       e.crew_review_status, e.crew_rejection_note, e.crew_reviewed_by_user_id, a.actor_name, a.actor_org_name,
       array_remove(ARRAY[e.org_id, a.actor_org], NULL), e.crew_reviewed_at
FROM public.co_labor_entries e LEFT JOIN public.co_line_items li ON li.id = e.co_line_item_id
CROSS JOIN LATERAL public._review_actor(e.crew_reviewed_by_user_id) a
WHERE e.crew_review_status IN ('approved','rejected') AND e.crew_reviewed_at IS NOT NULL;