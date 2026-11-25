CREATE OR REPLACE FUNCTION public._co_billing_snapshot(_co_id uuid, _org_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object('item',li.item_name,'description',li.description,'qty',li.qty,'unit',li.unit,'amount',COALESCE((SELECT sum(e.line_total) FROM public.co_labor_entries e WHERE e.co_line_item_id=li.id AND e.org_id=_org_id AND NOT e.is_actual_cost),0)) ORDER BY li.sort_order),'[]'::jsonb)
 FROM public.co_line_items li WHERE li.co_id=_co_id;
$$;
REVOKE ALL ON FUNCTION public._co_billing_snapshot(uuid,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._clear_reverted_co_correction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb; cid uuid; x public.co_corrections;
BEGIN
 r:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 cid:=(r->>'co_id')::uuid;
 FOR x IN SELECT * FROM public.co_corrections WHERE co_id=cid AND state='needs_correction' AND scope_snapshot IS NOT NULL AND decided_at IS NOT NULL AND approved_version>=COALESCE(submitted_version,0) LOOP
  IF NOT EXISTS(SELECT 1 FROM public.co_price_revisions p WHERE p.co_id=cid AND p.from_org_id=x.from_org_id AND p.status='pending')
     AND public._co_billing_snapshot(cid,x.from_org_id)=x.scope_snapshot
     AND NOT EXISTS(SELECT 1 FROM public.co_material_items m WHERE m.co_id=cid AND m.created_at>x.decided_at)
     AND NOT EXISTS(SELECT 1 FROM public.co_equipment_items q WHERE q.co_id=cid AND q.created_at>x.decided_at) THEN
   UPDATE public.co_corrections SET state='clean',approved_version=version,submitted_version=version WHERE co_id=x.co_id AND from_org_id=x.from_org_id;
  END IF;
 END LOOP;
 RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS zz_clear_reverted_labor_correction ON public.co_labor_entries;
CREATE TRIGGER zz_clear_reverted_labor_correction AFTER INSERT OR UPDATE OR DELETE ON public.co_labor_entries FOR EACH ROW EXECUTE FUNCTION public._clear_reverted_co_correction();