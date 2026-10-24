ALTER TABLE public.co_labor_entries ADD COLUMN crew_pricing_derived boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.co_labor_entries.crew_pricing_derived IS 'Generated crew-base billing or mirrored cost; manual labor entries must remain false.';
UPDATE public.co_labor_entries SET crew_pricing_derived = true WHERE id IN ('f0364885-3a4d-49f6-8f02-d8d4bffe692d','226683b9-a745-4639-ad40-da993689c37f') AND co_id='ea57b45f-77df-4501-95cd-ac992e960b15' AND entered_by_role='TC';
CREATE OR REPLACE FUNCTION public.set_crew_pricing_base(_co_id uuid, _enabled boolean, _org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.change_orders; biller uuid;
BEGIN
 SELECT * INTO c FROM public.change_orders WHERE id=_co_id FOR UPDATE;
 IF c.id IS NULL OR auth.uid() IS NULL OR _enabled IS NULL THEN RAISE EXCEPTION 'Order not found or not authorized'; END IF;
 biller := CASE WHEN c.created_by_role='FC' AND (c.originating_org_id IS NULL OR c.originating_org_id=c.org_id) AND c.assigned_to_org_id IS NOT NULL AND c.assigned_to_org_id<>c.org_id THEN c.assigned_to_org_id ELSE c.org_id END;
 IF biller<>_org_id OR NOT public.user_in_org(auth.uid(),_org_id) OR NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=_org_id AND type='TC') OR NOT public.is_project_participant(c.project_id) THEN RAISE EXCEPTION 'Not authorized to change this pricing base'; END IF;
 IF c.status NOT IN ('draft','shared','work_in_progress','closed_for_pricing') AND NOT (c.status='submitted' AND c.created_by_role='FC' AND c.assigned_to_org_id=_org_id AND (c.originating_org_id IS NULL OR c.originating_org_id=c.org_id)) THEN RAISE EXCEPTION 'Recall the upstream submission before changing billing'; END IF;
 IF NOT _enabled THEN
 DELETE FROM public.co_labor_entries WHERE co_id=_co_id AND org_id=_org_id AND entered_by_role='TC' AND crew_pricing_derived;
 END IF;
 UPDATE public.change_orders SET use_fc_pricing_base=_enabled,tc_submitted_price=NULL,tc_snapshot_hourly_rate=NULL,tc_snapshot_markup_percent=NULL,updated_at=now() WHERE id=_co_id;
END; $$;
REVOKE ALL ON FUNCTION public.set_crew_pricing_base(uuid,boolean,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_crew_pricing_base(uuid,boolean,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_crew_pricing_base(uuid,boolean,uuid) TO service_role;