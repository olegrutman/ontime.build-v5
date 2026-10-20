CREATE TABLE public.crew_workers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id),
 name text NOT NULL,
 pay_basis text NOT NULL DEFAULT 'hourly' CHECK (pay_basis IN ('hourly','daily')),
 rate numeric(12,2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_workers TO authenticated;
GRANT ALL ON public.crew_workers TO service_role;
ALTER TABLE public.crew_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY crew_workers_private ON public.crew_workers FOR ALL TO authenticated USING (public.user_in_org(auth.uid(), organization_id) AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id=organization_id AND o.type='FC')) WITH CHECK (public.user_in_org(auth.uid(), organization_id) AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id=organization_id AND o.type='FC'));
ALTER TABLE public.actual_cost_entries ADD COLUMN IF NOT EXISTS tracker_category text;
ALTER TABLE public.actual_cost_entries ADD COLUMN IF NOT EXISTS tracker_worker_id uuid REFERENCES public.crew_workers(id);
ALTER TABLE public.actual_cost_entries ADD COLUMN IF NOT EXISTS tracker_pay_basis text;
ALTER TABLE public.actual_cost_entries ADD COLUMN IF NOT EXISTS tracker_quantity numeric(10,2);
ALTER TABLE public.actual_cost_entries ADD COLUMN IF NOT EXISTS tracker_receipt_path text;
ALTER TABLE public.actual_cost_entries ADD COLUMN IF NOT EXISTS tracker_work_order_id uuid REFERENCES public.change_orders(id);
CREATE OR REPLACE FUNCTION public.validate_crew_tracker_cost() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.tracker_category IS NULL THEN RETURN NEW; END IF;
 IF NOT public.user_in_org(auth.uid(), NEW.organization_id) OR NOT EXISTS (SELECT 1 FROM public.organizations WHERE id=NEW.organization_id AND type='FC') THEN RAISE EXCEPTION 'Crew spending must belong to your crew company'; END IF;
 IF NEW.project_id IS NULL OR NOT public.can_see_project(NEW.project_id) OR NOT public.is_project_participant(auth.uid(), NEW.project_id) THEN RAISE EXCEPTION 'Project access required'; END IF;
 IF NEW.entered_by <> auth.uid() AND TG_OP='INSERT' THEN RAISE EXCEPTION 'Invalid cost author'; END IF;
 IF NEW.total_amount <= 0 THEN RAISE EXCEPTION 'Enter a positive cost'; END IF;
 IF NEW.tracker_worker_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.crew_workers w WHERE w.id=NEW.tracker_worker_id AND w.organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'Worker belongs to another company'; END IF;
 IF NEW.tracker_work_order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.change_orders c WHERE c.id=NEW.tracker_work_order_id AND c.project_id=NEW.project_id AND public.can_access_change_order(c.id, auth.uid())) THEN RAISE EXCEPTION 'Work order access required'; END IF;
 IF NEW.tracker_category='labor' THEN
  IF NEW.tracker_pay_basis NOT IN ('hourly','daily') OR NEW.tracker_pay_basis IS NULL OR NEW.tracker_quantity IS NULL OR NEW.tracker_quantity<=0 OR NEW.hourly_rate IS NULL OR NEW.hourly_rate<=0 THEN RAISE EXCEPTION 'Enter a valid pay rate and quantity'; END IF;
  NEW.total_amount := round(NEW.tracker_quantity*NEW.hourly_rate,2);
 ELSE
  IF NEW.lump_amount IS NULL OR NEW.lump_amount<=0 THEN RAISE EXCEPTION 'Enter a positive expense amount'; END IF;
  NEW.total_amount := round(NEW.lump_amount,2);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_crew_tracker_cost BEFORE INSERT OR UPDATE ON public.actual_cost_entries FOR EACH ROW EXECUTE FUNCTION public.validate_crew_tracker_cost();