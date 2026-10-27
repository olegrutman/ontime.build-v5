ALTER TABLE public.co_corrections ADD COLUMN scope_snapshot jsonb NOT NULL DEFAULT '[]';
DO $$ DECLARE fn text; BEGIN
 SELECT pg_get_functiondef('public.submit_co_correction(uuid,uuid)'::regprocedure) INTO fn;
 fn:=replace(fn,'IF c.org_id=x.from_org_id AND c.status', 'IF x.revision_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.co_price_revisions WHERE id=x.revision_id AND status=''pending'') THEN UPDATE public.co_corrections SET state=''pending'',submitted_version=version WHERE co_id=x.co_id AND from_org_id=x.from_org_id; UPDATE public.co_price_revisions SET status=''rejected'',decided_by=auth.uid(),decided_at=now() WHERE id=x.revision_id; END IF; IF c.org_id=x.from_org_id AND c.status');
 fn:=replace(fn,'revision_id=rid WHERE', 'revision_id=rid,scope_snapshot=COALESCE((SELECT jsonb_agg(jsonb_build_object(''item'',li.item_name,''description'',li.description,''qty'',li.qty,''unit'',li.unit,''amount'',COALESCE((SELECT sum(e.line_total) FROM public.co_labor_entries e WHERE e.co_line_item_id=li.id AND e.org_id=x.from_org_id AND NOT e.is_actual_cost),0)) ORDER BY li.sort_order) FROM public.co_line_items li WHERE li.co_id=c.id),''[]''::jsonb) WHERE');
 EXECUTE fn;
END; $$;
DO $$ DECLARE fn text; BEGIN
 SELECT pg_get_functiondef('public.submit_co_price_revision(uuid)'::regprocedure) INTO fn;
 fn:=replace(fn,'FROM public.co_line_items li JOIN (SELECT','FROM public.co_line_items li LEFT JOIN (SELECT');
 fn:=replace(fn,'''amount'',e.amount','''amount'',COALESCE(e.amount,0),''qty'',li.qty,''unit'',li.unit');
 EXECUTE fn;
END; $$;
COMMENT ON COLUMN public.co_corrections.scope_snapshot IS 'Explicit submission snapshot of scope and submitting-party billable amounts only; excludes private costs.';