CREATE OR REPLACE FUNCTION public.list_billable_change_orders(p_project_id uuid, p_from_org_id uuid)
RETURNS TABLE(co_id uuid, co_number text, title text, description text, contract_id uuid, contract_sum numeric, from_org_name text, to_org_id uuid, to_org_name text, to_role text, grand_total numeric, already_billed numeric, remaining numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_org_type public.org_type;
BEGIN
  IF NOT public.can_see_project(p_project_id) THEN RAISE EXCEPTION 'Not authorized' USING errcode = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = auth.uid() AND organization_id = p_from_org_id) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;
  SELECT o.type INTO v_org_type FROM public.organizations o WHERE o.id = p_from_org_id;
  RETURN QUERY
  WITH cos AS (
    SELECT co.id, co.co_number, co.title, co.reason_note AS description,
      CASE WHEN v_org_type = 'FC' THEN
        COALESCE((SELECT SUM(le.line_total) FROM public.co_labor_entries le
          JOIN public.co_line_items li ON li.id = le.co_line_item_id
          WHERE le.co_id = co.id AND le.org_id = p_from_org_id
            AND COALESCE(le.is_actual_cost, false) = false AND li.approval_status = 'approved'), 0)
      ELSE public.co_grand_total(co.id) END AS grand_total,
      CASE WHEN v_org_type = 'FC' THEN
        COALESCE(
          (SELECT pc.id FROM public.project_contracts pc WHERE pc.project_id = co.project_id AND pc.from_org_id = p_from_org_id
             AND pc.to_org_id IN (co.assigned_to_org_id, co.org_id) ORDER BY pc.created_at LIMIT 1),
          (SELECT pc.id FROM public.project_contracts pc WHERE pc.project_id = co.project_id AND pc.from_org_id = p_from_org_id
             ORDER BY pc.created_at LIMIT 1))
      ELSE public._co_target_contract_id(co.project_id, co.org_id, co.assigned_to_org_id) END AS contract_id
    FROM public.change_orders co
    WHERE co.project_id = p_project_id
      AND (co.org_id = p_from_org_id OR co.assigned_to_org_id = p_from_org_id OR co.originating_org_id = p_from_org_id
        OR EXISTS (SELECT 1 FROM public.change_order_collaborators cc WHERE cc.co_id = co.id AND cc.organization_id = p_from_org_id))
      AND co.status IN ('approved','contracted') AND co.approved_at IS NOT NULL
  ),
  billed AS (
    SELECT b.co_id, COALESCE(SUM(b.amount), 0) AS amount FROM (
      SELECT ili.source_co_id AS co_id, ili.current_billed AS amount
      FROM public.invoice_line_items ili
      JOIN public.invoices inv ON inv.id = ili.invoice_id
      JOIN public.project_contracts ic ON ic.id = inv.contract_id
      WHERE ili.source_co_id IS NOT NULL AND inv.project_id = p_project_id
        AND inv.status IN ('SUBMITTED','APPROVED','PAID') AND ic.from_org_id = p_from_org_id
      UNION ALL
      SELECT co_id_unnest::uuid,
        COALESCE((SELECT SUM(ili.current_billed) FROM public.invoice_line_items ili
                  WHERE ili.invoice_id = inv.id AND ili.source_co_id IS NULL), 0)
          / GREATEST(array_length(inv.co_ids, 1), 1)
      FROM public.invoices inv
      JOIN public.project_contracts ic ON ic.id = inv.contract_id
      CROSS JOIN LATERAL unnest(COALESCE(inv.co_ids, ARRAY[]::text[])) AS co_id_unnest
      WHERE inv.project_id = p_project_id AND inv.status IN ('SUBMITTED','APPROVED','PAID') AND ic.from_org_id = p_from_org_id
    ) b GROUP BY b.co_id
  )
  SELECT cos.id, cos.co_number, cos.title, cos.description, cos.contract_id,
    COALESCE(pc.contract_sum, 0)::numeric, fo.name, pc.to_org_id, o.name, pc.to_role,
    COALESCE(cos.grand_total, 0)::numeric, COALESCE(billed.amount, 0)::numeric,
    GREATEST(COALESCE(cos.grand_total, 0) - COALESCE(billed.amount, 0), 0)::numeric
  FROM cos
  LEFT JOIN public.project_contracts pc ON pc.id = cos.contract_id
  LEFT JOIN public.organizations o ON o.id = pc.to_org_id
  LEFT JOIN public.organizations fo ON fo.id = pc.from_org_id
  LEFT JOIN billed ON billed.co_id = cos.id
  WHERE cos.contract_id IS NOT NULL AND COALESCE(cos.grand_total, 0) > 0
  ORDER BY cos.co_number NULLS LAST;
END;
$function$;

CREATE OR REPLACE FUNCTION public.build_co_sov(_co_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _co RECORD; _sov_id uuid; _contract_id uuid; _contract_mat text; _biller uuid;
  _mat_resp text; _eq_resp text; _approved numeric;
  _mats numeric := 0; _eq numeric := 0; _total numeric := 0; _sort int := 0; _labor numeric := 0;
BEGIN
  SELECT id, project_id, co_number, title, status, pricing_type, org_id, assigned_to_org_id,
         tc_submitted_price, approved_amount,
         co_material_responsible_override, materials_responsible,
         co_equipment_responsible_override, equipment_responsible
  INTO _co FROM public.change_orders WHERE id = _co_id;
  IF _co.id IS NULL OR LOWER(COALESCE(_co.status, '')) <> 'approved' THEN RETURN NULL; END IF;
  IF LOWER(COALESCE(_co.pricing_type, 'fixed')) IN ('tm', 'nte') THEN RETURN NULL; END IF;
  SELECT id INTO _sov_id FROM public.project_sov WHERE source_co_id = _co_id;
  IF _sov_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.invoices WHERE sov_id = _sov_id) THEN RETURN _sov_id; END IF;
  _contract_id := public._co_target_contract_id(_co.project_id, _co.org_id, _co.assigned_to_org_id);
  IF _contract_id IS NULL THEN
    SELECT pc.id INTO _contract_id FROM public.project_contracts pc WHERE pc.project_id = _co.project_id
    ORDER BY (COALESCE(pc.from_role, '') = 'Owner'), pc.created_at LIMIT 1;
  END IF;
  SELECT from_org_id INTO _biller FROM public.project_contracts WHERE id = _contract_id;
  _biller := COALESCE(_biller, _co.org_id);
  SELECT pc.material_responsibility INTO _contract_mat FROM public.project_contracts pc
  WHERE pc.project_id = _co.project_id AND pc.material_responsibility IS NOT NULL
  ORDER BY (COALESCE(pc.from_role, '') = 'Owner'), pc.created_at LIMIT 1;
  _mat_resp := COALESCE(_co.co_material_responsible_override, _co.materials_responsible, _contract_mat, 'TC');
  _eq_resp := COALESCE(_co.co_equipment_responsible_override, _co.equipment_responsible, 'TC');
  IF _mat_resp <> 'GC' THEN SELECT COALESCE(SUM(billed_amount), 0) INTO _mats FROM public.co_material_items WHERE co_id = _co_id; END IF;
  IF _eq_resp <> 'GC' THEN SELECT COALESCE(SUM(billed_amount), 0) INTO _eq FROM public.co_equipment_items WHERE co_id = _co_id; END IF;
  IF _sov_id IS NULL THEN
    INSERT INTO public.project_sov (project_id, contract_id, sov_name, sov_kind, source_co_id)
    VALUES (_co.project_id, _contract_id, public.co_sov_display_name(_co.co_number, _co.title), 'change_order', _co_id)
    RETURNING id INTO _sov_id;
  ELSE
    DELETE FROM public.project_sov_items WHERE sov_id = _sov_id;
    UPDATE public.project_sov SET sov_name = public.co_sov_display_name(_co.co_number, _co.title), contract_id = _contract_id WHERE id = _sov_id;
  END IF;
  WITH lines AS (
    SELECT li.id, li.item_name, li.sort_order,
      COALESCE((SELECT SUM(le.line_total) FROM public.co_labor_entries le
                WHERE le.co_line_item_id = li.id AND NOT le.is_actual_cost AND le.org_id = _biller), 0) AS amount
    FROM public.co_line_items li WHERE li.co_id = _co_id AND li.approval_status = 'approved'
  )
  INSERT INTO public.project_sov_items
    (project_id, sov_id, sort_order, item_name, item_group, source, value_amount, scheduled_value)
  SELECT _co.project_id, _sov_id, ROW_NUMBER() OVER (ORDER BY COALESCE(sort_order, 0), item_name),
         COALESCE(NULLIF(item_name, ''), 'CO line'), 'Change order', 'template', amount, amount
  FROM lines WHERE amount > 0;
  SELECT COALESCE(SUM(value_amount), 0) INTO _labor FROM public.project_sov_items WHERE sov_id = _sov_id;
  _approved := COALESCE(_co.approved_amount, _co.tc_submitted_price);
  IF _biller = _co.org_id AND COALESCE(_approved, 0) > 0
     AND ROUND(_labor + _mats + _eq, 2) <> ROUND(_approved, 2) THEN
    DELETE FROM public.project_sov_items WHERE sov_id = _sov_id;
    _labor := GREATEST(_approved - _mats - _eq, 0);
    IF _labor > 0 THEN
      INSERT INTO public.project_sov_items
        (project_id, sov_id, sort_order, item_name, item_group, source, value_amount, scheduled_value)
      VALUES (_co.project_id, _sov_id, 1, COALESCE(NULLIF(_co.title, ''), 'Labor'), 'Change order', 'template', _labor, _labor);
    END IF;
  END IF;
  SELECT COALESCE(MAX(sort_order), 0) INTO _sort FROM public.project_sov_items WHERE sov_id = _sov_id;
  IF _mats > 0 THEN
    _sort := _sort + 1;
    INSERT INTO public.project_sov_items
      (project_id, sov_id, sort_order, item_name, item_group, source, value_amount, scheduled_value)
    VALUES (_co.project_id, _sov_id, _sort, 'Materials', 'Change order', 'template', _mats, _mats);
  END IF;
  IF _eq > 0 THEN
    _sort := _sort + 1;
    INSERT INTO public.project_sov_items
      (project_id, sov_id, sort_order, item_name, item_group, source, value_amount, scheduled_value)
    VALUES (_co.project_id, _sov_id, _sort, 'Equipment', 'Change order', 'template', _eq, _eq);
  END IF;
  SELECT COALESCE(SUM(value_amount), 0) INTO _total FROM public.project_sov_items WHERE sov_id = _sov_id;
  IF _total > 0 THEN
    UPDATE public.project_sov_items
    SET percent_of_contract = ROUND((value_amount / _total) * 100, 2), remaining_amount = value_amount
    WHERE sov_id = _sov_id;
  END IF;
  RETURN _sov_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_co_price_revision(_co_id uuid)
RETURNS co_price_revisions LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.change_orders; r public.co_price_revisions; labor numeric; mats numeric:=0; eq numeric:=0; proposal numeric; total numeric; scope jsonb;
BEGIN
 SELECT * INTO c FROM public.change_orders WHERE id=_co_id FOR UPDATE;
 IF auth.uid() IS NULL OR c.id IS NULL OR NOT public.can_see_project(c.project_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.user_org_roles u JOIN public.organizations o ON o.id=u.organization_id LEFT JOIN public.member_permissions p ON p.user_org_role_id=u.id WHERE u.user_id=auth.uid() AND u.organization_id=c.org_id AND o.type='TC' AND (u.is_admin OR COALESCE(p.can_create_work_orders,false))) THEN RAISE EXCEPTION 'Only the submitting company can request a price revision'; END IF;
 IF c.status NOT IN ('approved','contracted') OR c.approved_at IS NULL THEN RAISE EXCEPTION 'Price revisions require an approved order'; END IF;
 IF EXISTS (SELECT 1 FROM public.co_line_items WHERE co_id=c.id AND approval_status='rejected') THEN RAISE EXCEPTION 'A partially approved order needs item-level price corrections before revision'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id=c.assigned_to_org_id AND type='GC') THEN RAISE EXCEPTION 'No general contractor assigned'; END IF;
 SELECT COALESCE(sum(line_total),0) INTO labor FROM public.co_labor_entries WHERE co_id=c.id AND org_id=c.org_id AND entered_by_role='TC' AND NOT is_actual_cost;
 IF COALESCE(c.co_material_responsible_override,c.materials_responsible,'TC') <> 'GC' THEN SELECT COALESCE(sum(billed_amount),0) INTO mats FROM public.co_material_items WHERE co_id=c.id AND org_id=c.org_id; END IF;
 IF COALESCE(c.co_equipment_responsible_override,c.equipment_responsible,'TC') <> 'GC' THEN SELECT COALESCE(sum(billed_amount),0) INTO eq FROM public.co_equipment_items WHERE co_id=c.id AND org_id=c.org_id; END IF;
 proposal:=round(CASE WHEN c.use_fc_pricing_base THEN labor ELSE labor+mats+eq END,2); total:=round(labor+mats+eq,2);
 IF proposal<0 OR (proposal=COALESCE(c.tc_submitted_price,0) AND NOT EXISTS(SELECT 1 FROM public.co_corrections x WHERE x.co_id=c.id AND x.from_org_id=c.org_id AND x.version>x.approved_version)) THEN RAISE EXCEPTION 'No changed billable price to submit'; END IF;
 IF c.pricing_type='nte' AND c.nte_cap>0 AND total>c.nte_cap THEN RAISE EXCEPTION 'Approve a higher not-to-exceed cap first'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('item',li.item_name,'description',li.description,'amount',COALESCE(e.amount,0),'qty',li.qty,'unit',li.unit) ORDER BY li.sort_order),'[]') INTO scope FROM public.co_line_items li LEFT JOIN (SELECT co_line_item_id,sum(line_total) amount FROM public.co_labor_entries WHERE co_id=c.id AND org_id=c.org_id AND entered_by_role='TC' AND NOT is_actual_cost GROUP BY co_line_item_id) e ON e.co_line_item_id=li.id WHERE li.co_id=c.id;
 INSERT INTO public.co_price_revisions(co_id,from_org_id,to_org_id,previous_price,proposed_price,proposed_total,scope_snapshot,submitted_by) VALUES(c.id,c.org_id,c.assigned_to_org_id,COALESCE(c.tc_submitted_price,0),proposal,total,scope,auth.uid()) RETURNING * INTO r;
 INSERT INTO public.notifications(recipient_org_id,type,title,body,entity_type,entity_id,action_url,created_by,event_key) VALUES(c.assigned_to_org_id,'CHANGE_SUBMITTED','Revised price needs approval',COALESCE(c.co_number,'Order')||': revised price '||proposal,'change_order',c.id,'/project/'||c.project_id||'/change-orders/'||c.id,auth.uid(),'co-price-revision:'||r.id) ON CONFLICT DO NOTHING;
 RETURN r;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_accepted_co_price_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.change_orders; old_total numeric; new_total numeric; contract_id uuid;
BEGIN
 IF OLD.status <> 'pending' OR NEW.status <> 'approved' THEN RETURN NEW; END IF;
 SELECT * INTO c FROM public.change_orders WHERE id=NEW.co_id FOR UPDATE;
 IF auth.uid() IS NULL OR NEW.decided_by IS DISTINCT FROM auth.uid() OR NOT public.can_see_project(c.project_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.user_org_roles u JOIN public.organizations o ON o.id=u.organization_id LEFT JOIN public.member_permissions p ON p.user_org_role_id=u.id WHERE u.user_id=auth.uid() AND u.organization_id=NEW.to_org_id AND o.type='GC' AND (u.is_admin OR COALESCE(p.can_approve_invoices,false))) THEN RAISE EXCEPTION 'Only the assigned contractor may decide this revision'; END IF;
 IF c.status NOT IN ('approved','contracted') OR c.assigned_to_org_id IS DISTINCT FROM NEW.to_org_id OR c.org_id IS DISTINCT FROM NEW.from_org_id OR COALESCE(c.tc_submitted_price,0)<>NEW.previous_price THEN RAISE EXCEPTION 'Order changed since this revision was submitted'; END IF;
 IF EXISTS (SELECT 1 FROM public.co_line_items WHERE co_id=c.id AND approval_status='rejected') THEN RAISE EXCEPTION 'A partially approved order needs item-level price corrections before revision'; END IF;
 IF c.pricing_type='nte' AND c.nte_cap>0 AND NEW.proposed_total>c.nte_cap THEN RAISE EXCEPTION 'Revision exceeds not-to-exceed cap'; END IF;
 old_total:=public.co_grand_total(c.id);
 contract_id:=public._co_target_contract_id(c.project_id,c.org_id,c.assigned_to_org_id);
 IF contract_id IS NULL THEN RAISE EXCEPTION 'No contract found for this order'; END IF;
 new_total:=NEW.proposed_total;
 UPDATE public.change_orders SET tc_submitted_price=NEW.proposed_price,approved_amount=new_total,updated_at=now() WHERE id=c.id;
 UPDATE public.project_contracts SET contract_sum=COALESCE(contract_sum,0)+(new_total-old_total),co_approved_sum=COALESCE(co_approved_sum,0)+(new_total-old_total),updated_at=now() WHERE id=contract_id;
 RETURN NEW;
END;
$function$;