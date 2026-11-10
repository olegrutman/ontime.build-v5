CREATE OR REPLACE FUNCTION public.set_co_procurement_responsibility(_co_id uuid,_kind text,_responsible text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
DECLARE c public.change_orders; old_value text; field text;
BEGIN
 IF _kind NOT IN ('material','equipment') OR _kind IS NULL THEN RAISE EXCEPTION 'Invalid responsibility type'; END IF;
 IF _responsible IS NOT NULL AND _responsible NOT IN ('GC','TC') THEN RAISE EXCEPTION 'Invalid responsible party'; END IF;
 SELECT * INTO c FROM public.change_orders WHERE id=_co_id FOR UPDATE;
 IF c.id IS NULL OR c.status='withdrawn' THEN RAISE EXCEPTION 'Order not editable'; END IF;
 IF auth.uid() IS NULL OR NOT public.can_see_project(c.project_id) OR NOT EXISTS(
  SELECT 1 FROM public.user_org_roles r JOIN public.organizations o ON o.id=r.organization_id
  WHERE r.user_id=auth.uid() AND r.organization_id IN (c.org_id,c.assigned_to_org_id) AND o.type::text IN ('GC','TC')
 ) THEN RAISE EXCEPTION 'Only the owning or assigned contractor can change responsibility' USING ERRCODE='42501'; END IF;
 field:=CASE WHEN _kind='material' THEN 'co_material_responsible_override' ELSE 'co_equipment_responsible_override' END;
 old_value:=CASE WHEN _kind='material' THEN c.co_material_responsible_override ELSE c.co_equipment_responsible_override END;
 IF old_value IS NOT DISTINCT FROM _responsible THEN RETURN; END IF;
 IF _kind='material' THEN
  UPDATE public.change_orders SET co_material_responsible_override=_responsible,updated_at=now() WHERE id=c.id;
 ELSE
  UPDATE public.change_orders SET co_equipment_responsible_override=_responsible,updated_at=now() WHERE id=c.id;
 END IF;
 INSERT INTO public.co_audit_log(co_id,source_table,source_row_id,field_name,old_value,new_value)
 VALUES(c.id,'change_orders',c.id,field,to_jsonb(old_value),to_jsonb(_responsible));
 -- Existing correction tracking records the change; approved prices/status and invoices stay unchanged.
END; $function$;
REVOKE ALL ON FUNCTION public.set_co_procurement_responsibility(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_co_procurement_responsibility(uuid,text,text) TO authenticated;