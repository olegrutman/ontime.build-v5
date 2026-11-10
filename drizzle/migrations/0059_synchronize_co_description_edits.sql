CREATE OR REPLACE FUNCTION public.update_co_description(_co_id uuid, _line_item_id uuid, _title text, _description text, _request_review boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
 c public.change_orders; li public.co_line_items; sole public.co_line_items;
 owner_org uuid; item_count integer; previous_skip text; new_title text;
BEGIN
 SELECT * INTO c FROM public.change_orders WHERE id=_co_id FOR UPDATE;
 IF c.id IS NULL OR c.status='withdrawn' THEN RAISE EXCEPTION 'Order not editable'; END IF;
 IF _line_item_id IS NOT NULL THEN
  SELECT * INTO li FROM public.co_line_items WHERE id=_line_item_id AND co_id=_co_id FOR UPDATE;
  IF li.id IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;
  owner_org:=li.org_id;
 ELSE owner_org:=c.org_id;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_org_roles WHERE user_id=auth.uid() AND organization_id=owner_org) THEN
  RAISE EXCEPTION 'Only the creator can edit this description';
 END IF;
 SELECT count(*) INTO item_count FROM public.co_line_items WHERE co_id=_co_id;
 IF item_count=1 THEN SELECT * INTO sole FROM public.co_line_items WHERE co_id=_co_id FOR UPDATE; END IF;
 previous_skip:=COALESCE(current_setting('app.skip_co_correction',true),'off');
 -- Record one correction for this logical edit, not one per mirrored row.
 PERFORM set_config('app.skip_co_correction','on',true);
 IF _line_item_id IS NOT NULL THEN
  new_title:=COALESCE(NULLIF(btrim(_title),''),li.item_name);
  UPDATE public.co_line_items SET item_name=new_title,description=NULLIF(btrim(_description),'') WHERE id=li.id;
  IF li.org_id=c.org_id THEN
   IF item_count=1 THEN
    UPDATE public.change_orders SET title=new_title,problem_summary=NULLIF(btrim(_description),''),updated_at=now() WHERE id=c.id;
   ELSE
    -- Keep distinct item scope; replace the obsolete summary with the current scope aggregate.
    UPDATE public.change_orders SET problem_summary=(SELECT string_agg(COALESCE(NULLIF(btrim(description),''),item_name),E'\n\n' ORDER BY sort_order,created_at,id) FROM public.co_line_items WHERE co_id=c.id),updated_at=now() WHERE id=c.id;
   END IF;
  END IF;
 ELSE
  new_title:=COALESCE(NULLIF(btrim(_title),''),c.title);
  UPDATE public.change_orders SET title=new_title,problem_summary=NULLIF(btrim(_description),''),updated_at=now() WHERE id=c.id;
  -- A header describes the whole order: never replace several different items or another company's scope.
  IF item_count=1 AND sole.org_id=c.org_id THEN
   UPDATE public.co_line_items SET item_name=COALESCE(new_title,item_name),description=NULLIF(btrim(_description),'') WHERE id=sole.id;
  END IF;
 END IF;
 PERFORM set_config('app.skip_co_correction',previous_skip,true);
 IF COALESCE(_request_review,false) THEN
  INSERT INTO public.co_corrections(co_id,from_org_id,to_org_id,project_id,changed_by)
  VALUES(c.id,owner_org,CASE WHEN owner_org=c.org_id THEN c.assigned_to_org_id ELSE c.org_id END,c.project_id,auth.uid())
  ON CONFLICT(co_id,from_org_id) DO UPDATE SET version=co_corrections.version+1,state='needs_correction',changed_at=now(),changed_by=auth.uid();
 END IF;
END; $function$;
REVOKE ALL ON FUNCTION public.update_co_description(uuid,uuid,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_co_description(uuid,uuid,text,text,boolean) TO authenticated;