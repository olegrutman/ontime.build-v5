CREATE TABLE public.crew_job_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.projects(id), organization_id uuid NOT NULL REFERENCES public.organizations(id), crew_name text NOT NULL CHECK(length(trim(crew_name)) BETWEEN 1 AND 100), task_name text NOT NULL CHECK(length(trim(task_name)) BETWEEN 1 AND 300), pay_basis text NOT NULL CHECK(pay_basis IN ('sq_ft','unit','fixed')), quantity numeric(12,2) NOT NULL CHECK(quantity>0), rate numeric(12,2) NOT NULL CHECK(rate>0), completed_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK(completed_percent BETWEEN 0 AND 100), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.crew_job_tasks TO authenticated;
GRANT ALL ON public.crew_job_tasks TO service_role;
ALTER TABLE public.crew_job_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY crew_job_tasks_private ON public.crew_job_tasks FOR ALL TO authenticated USING (public.user_in_org(auth.uid(),organization_id) AND public.can_see_project(project_id) AND EXISTS(SELECT 1 FROM public.project_participants p JOIN public.organizations o ON o.id=p.organization_id WHERE p.project_id=crew_job_tasks.project_id AND p.organization_id=crew_job_tasks.organization_id AND p.invite_status='ACCEPTED' AND o.type='FC')) WITH CHECK (public.user_in_org(auth.uid(),organization_id) AND public.can_see_project(project_id) AND EXISTS(SELECT 1 FROM public.project_participants p JOIN public.organizations o ON o.id=p.organization_id WHERE p.project_id=crew_job_tasks.project_id AND p.organization_id=crew_job_tasks.organization_id AND p.invite_status='ACCEPTED' AND o.type='FC'));
ALTER TABLE public.actual_cost_entries ADD COLUMN tracker_job_task_id uuid REFERENCES public.crew_job_tasks(id);
ALTER TABLE public.crew_project_budgets ADD COLUMN worker_labor numeric(12,2) CHECK(worker_labor>=0);
ALTER TABLE public.crew_project_budgets ADD COLUMN hired_labor numeric(12,2) CHECK(hired_labor>=0);
CREATE OR REPLACE FUNCTION public.guard_crew_job_task() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE paid numeric;
BEGIN
 IF TG_OP='UPDATE' THEN
 SELECT coalesce(sum(total_amount),0) INTO paid FROM public.actual_cost_entries WHERE tracker_job_task_id=OLD.id;
 IF NEW.organization_id<>OLD.organization_id OR NEW.project_id<>OLD.project_id THEN RAISE EXCEPTION 'Task company and project cannot change'; END IF;
 IF paid>0 AND (NEW.rate<>OLD.rate OR NEW.quantity<>OLD.quantity OR NEW.pay_basis<>OLD.pay_basis) THEN RAISE EXCEPTION 'Pricing cannot change after a payment'; END IF;
 IF round(NEW.quantity*NEW.rate*NEW.completed_percent/100,2)<paid THEN RAISE EXCEPTION 'Progress cannot fall below payments already logged'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_crew_job_task BEFORE UPDATE ON public.crew_job_tasks FOR EACH ROW EXECUTE FUNCTION public.guard_crew_job_task();
CREATE OR REPLACE FUNCTION public.guard_crew_job_draw() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE t public.crew_job_tasks; paid numeric;
BEGIN
 IF TG_OP='UPDATE' AND OLD.tracker_job_task_id IS NOT NULL THEN RAISE EXCEPTION 'Delete and re-log a crew payment to correct it'; END IF;
 IF NEW.tracker_job_task_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO t FROM public.crew_job_tasks WHERE id=NEW.tracker_job_task_id FOR UPDATE;
 IF t.id IS NULL OR t.organization_id<>NEW.organization_id OR t.project_id<>NEW.project_id OR NOT public.user_in_org(auth.uid(),t.organization_id) OR NOT public.can_see_project(t.project_id) THEN RAISE EXCEPTION 'Crew task access required'; END IF;
 IF NEW.tracker_worker_id IS NOT NULL OR NEW.tracker_category IS DISTINCT FROM 'labor' OR NEW.tracker_pay_basis IS DISTINCT FROM 'unit' OR NEW.tracker_quantity IS DISTINCT FROM 1::numeric OR NEW.total_amount<=0 THEN RAISE EXCEPTION 'Invalid crew draw'; END IF;
 SELECT coalesce(sum(total_amount),0) INTO paid FROM public.actual_cost_entries WHERE tracker_job_task_id=t.id;
 IF paid+NEW.total_amount>round(t.quantity*t.rate*t.completed_percent/100,2) THEN RAISE EXCEPTION 'Payment exceeds completed work or remaining task balance'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_guard_crew_job_draw BEFORE INSERT OR UPDATE ON public.actual_cost_entries FOR EACH ROW EXECUTE FUNCTION public.guard_crew_job_draw();
CREATE OR REPLACE FUNCTION public.record_crew_job_draw(p_task_id uuid,p_percent numeric,p_amount numeric,p_date date) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE t public.crew_job_tasks; paid numeric; entry_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO t FROM public.crew_job_tasks WHERE id=p_task_id FOR UPDATE;
 IF t.id IS NULL THEN RAISE EXCEPTION 'Crew task access required'; END IF;
 IF p_percent IS NULL OR p_percent<0 OR p_percent>100 OR p_amount IS NULL OR p_amount<0 OR p_date IS NULL THEN RAISE EXCEPTION 'Enter valid progress, payment and date'; END IF;
 UPDATE public.crew_job_tasks SET completed_percent=p_percent WHERE id=t.id;
 SELECT coalesce(sum(total_amount),0) INTO paid FROM public.actual_cost_entries WHERE tracker_job_task_id=t.id;
 IF p_amount>round(t.quantity*t.rate*p_percent/100,2)-paid THEN RAISE EXCEPTION 'Payment exceeds completed work or remaining task balance'; END IF;
 IF p_amount>0 THEN
 INSERT INTO public.actual_cost_entries(project_id,organization_id,entered_by,entry_date,cost_type,description,tracker_category,tracker_pay_basis,tracker_quantity,hourly_rate,lump_amount,total_amount,tracker_job_task_id) VALUES(t.project_id,t.organization_id,auth.uid(),p_date,'lump_sum',t.crew_name || ' · ' || t.task_name || ' · ' || p_percent || '% complete','labor','unit',1,p_amount,p_amount,p_amount,t.id) RETURNING id INTO entry_id;
 END IF;
 RETURN entry_id;
END $$;
REVOKE ALL ON FUNCTION public.record_crew_job_draw(uuid,numeric,numeric,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_crew_job_draw(uuid,numeric,numeric,date) TO authenticated;
CREATE INDEX crew_job_tasks_project_org ON public.crew_job_tasks(project_id,organization_id);
CREATE INDEX crew_draw_task ON public.actual_cost_entries(tracker_job_task_id) WHERE tracker_job_task_id IS NOT NULL;