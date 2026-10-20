ALTER TABLE public.actual_cost_entries ADD COLUMN tracker_draw_request_id uuid;
CREATE UNIQUE INDEX crew_draw_request_unique ON public.actual_cost_entries(tracker_draw_request_id) WHERE tracker_draw_request_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.record_crew_job_draw_once(p_task_id uuid,p_percent numeric,p_amount numeric,p_date date,p_request_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE t public.crew_job_tasks; existing_id uuid; entry_id uuid;
BEGIN
 IF p_request_id IS NULL THEN RAISE EXCEPTION 'Payment request required'; END IF;
 SELECT * INTO t FROM public.crew_job_tasks WHERE id=p_task_id FOR UPDATE;
 IF t.id IS NULL THEN RAISE EXCEPTION 'Crew task access required'; END IF;
 SELECT id INTO existing_id FROM public.actual_cost_entries WHERE tracker_draw_request_id=p_request_id AND tracker_job_task_id=t.id;
 IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;
 entry_id:=public.record_crew_job_draw(p_task_id,p_percent,p_amount,p_date);
 IF entry_id IS NOT NULL THEN
 -- Request association is set through a session setting consumed by the insert trigger, not an update of a posted payment.
 RETURN entry_id;
 END IF;
 RETURN NULL;
END $$;
-- Associate request identity at insert time so posted draws stay immutable.
CREATE OR REPLACE FUNCTION public.set_crew_draw_request() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.tracker_job_task_id IS NOT NULL THEN NEW.tracker_draw_request_id:=nullif(current_setting('ontime.crew_draw_request',true),'')::uuid; END IF; RETURN NEW; END $$;
CREATE TRIGGER set_crew_draw_request BEFORE INSERT ON public.actual_cost_entries FOR EACH ROW EXECUTE FUNCTION public.set_crew_draw_request();
CREATE OR REPLACE FUNCTION public.record_crew_job_draw_once(p_task_id uuid,p_percent numeric,p_amount numeric,p_date date,p_request_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE t public.crew_job_tasks; existing_id uuid; entry_id uuid;
BEGIN
 IF p_request_id IS NULL THEN RAISE EXCEPTION 'Payment request required'; END IF;
 SELECT * INTO t FROM public.crew_job_tasks WHERE id=p_task_id FOR UPDATE;
 IF t.id IS NULL THEN RAISE EXCEPTION 'Crew task access required'; END IF;
 SELECT id INTO existing_id FROM public.actual_cost_entries WHERE tracker_draw_request_id=p_request_id AND tracker_job_task_id=t.id;
 IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;
 PERFORM set_config('ontime.crew_draw_request',p_request_id::text,true);
 entry_id:=public.record_crew_job_draw(p_task_id,p_percent,p_amount,p_date);
 RETURN entry_id;
END $$;
REVOKE ALL ON FUNCTION public.record_crew_job_draw_once(uuid,numeric,numeric,date,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_crew_job_draw_once(uuid,numeric,numeric,date,uuid) TO authenticated;