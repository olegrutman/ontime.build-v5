ALTER TABLE public.crew_workers DROP CONSTRAINT IF EXISTS crew_workers_pay_basis_check;
ALTER TABLE public.crew_workers ADD CONSTRAINT crew_workers_pay_basis_check CHECK (pay_basis IN ('hourly','daily','sq_ft','unit'));
CREATE OR REPLACE FUNCTION public.validate_crew_tracker_cost() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.tracker_category IS NULL THEN RETURN NEW; END IF;
 IF NOT public.user_in_org(auth.uid(), NEW.organization_id) OR NOT EXISTS (SELECT 1 FROM public.organizations WHERE id=NEW.organization_id AND type='FC') THEN RAISE EXCEPTION 'Crew spending must belong to your crew company'; END IF;
 IF NEW.project_id IS NULL OR NOT public.can_see_project(NEW.project_id) OR NOT public.is_project_participant(auth.uid(), NEW.project_id) THEN RAISE EXCEPTION 'Project access required'; END IF;
 IF NEW.entered_by <> auth.uid() AND TG_OP='INSERT' THEN RAISE EXCEPTION 'Invalid cost author'; END IF;
 IF NEW.tracker_worker_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.crew_workers w WHERE w.id=NEW.tracker_worker_id AND w.organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'Worker belongs to another company'; END IF;
 IF NEW.tracker_work_order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.change_orders c WHERE c.id=NEW.tracker_work_order_id AND c.project_id=NEW.project_id AND public.can_access_change_order(c.id, auth.uid())) THEN RAISE EXCEPTION 'Work order access required'; END IF;
 IF NEW.tracker_category='labor' THEN
  IF NEW.tracker_pay_basis IS NULL OR NEW.tracker_pay_basis NOT IN ('hourly','daily','sq_ft','unit') OR NEW.tracker_quantity IS NULL OR NEW.tracker_quantity<=0 OR NEW.hourly_rate IS NULL OR NEW.hourly_rate<=0 THEN RAISE EXCEPTION 'Enter a valid pay rate and quantity'; END IF;
  NEW.total_amount := round(NEW.tracker_quantity*NEW.hourly_rate,2);
 ELSE
  IF NEW.lump_amount IS NULL OR NEW.lump_amount<=0 THEN RAISE EXCEPTION 'Enter a positive expense amount'; END IF;
  NEW.total_amount := round(NEW.lump_amount,2);
 END IF;
 IF NEW.total_amount <= 0 THEN RAISE EXCEPTION 'Enter a positive cost'; END IF;
 RETURN NEW;
END $$;