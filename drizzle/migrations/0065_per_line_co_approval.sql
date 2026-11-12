ALTER TABLE public.co_line_items
  ADD COLUMN approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN approval_rejection_reason text,
  ADD COLUMN approval_decided_by uuid,
  ADD COLUMN approval_decided_at timestamptz;

ALTER TABLE public.change_orders
  ADD COLUMN approved_amount numeric;

UPDATE public.co_line_items li
SET approval_status = 'approved', approval_decided_at = c.approved_at
FROM public.change_orders c
WHERE c.id = li.co_id AND (c.status IN ('approved','contracted') OR c.approved_at IS NOT NULL);

UPDATE public.co_line_items li
SET approval_status = 'rejected',
    approval_rejection_reason = COALESCE(NULLIF(btrim(c.rejection_note), ''), 'Rejected before item-level review'),
    approval_decided_at = c.rejected_at
FROM public.change_orders c
WHERE c.id = li.co_id AND c.status = 'rejected' AND c.approved_at IS NULL;

ALTER TABLE public.co_line_items
  ADD CONSTRAINT co_line_items_approval_status_check CHECK (approval_status IN ('pending','approved','rejected')),
  ADD CONSTRAINT co_line_items_rejection_reason_check CHECK (approval_status <> 'rejected' OR NULLIF(btrim(approval_rejection_reason), '') IS NOT NULL);

ALTER TABLE public.change_orders
  ADD CONSTRAINT change_orders_approved_amount_check CHECK (approved_amount IS NULL OR approved_amount >= 0);

COMMENT ON COLUMN public.co_line_items.approval_status IS 'Final upstream scope-item review decision; protected and changed only through review_co_line_items.';
COMMENT ON COLUMN public.change_orders.approved_amount IS 'Final approved order value after item review; null preserves the legacy whole-order total.';

CREATE OR REPLACE VIEW public.co_line_items_role_view
WITH (security_invoker=on) AS
SELECT id, co_id, org_id, created_by_role, catalog_item_id, item_name, division,
       category_name, unit, qty, sort_order, created_at, location_tag, reason,
       description, quantity_source, ai_confidence, ai_reasoning, task_index,
       pricing_mode, task_phase, pricing_type,
       CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc','tc']) THEN nte_cap ELSE NULL::numeric END AS nte_cap,
       source, scenario_id, group_key,
       approval_status, approval_rejection_reason, approval_decided_by, approval_decided_at
FROM public.co_line_items;

CREATE OR REPLACE VIEW public.change_orders_role_view
WITH (security_invoker=on) AS
SELECT id, org_id, project_id, created_by_user_id, created_by_role, co_number, title,
       status, pricing_type,
       CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc','tc','fc']) THEN nte_cap ELSE NULL::numeric END AS nte_cap,
       CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc','tc','fc']) THEN nte_increase_requested ELSE NULL::numeric END AS nte_increase_requested,
       nte_increase_approved, reason, reason_note, location_tag, assigned_to_org_id,
       fc_input_needed, materials_needed, materials_on_site, equipment_needed,
       materials_responsible, equipment_responsible, shared_at, combined_at,
       combined_co_id, parent_co_id, submitted_at, approved_at, rejected_at,
       rejection_note, contracted_at, draft_shared_with_next, created_at, updated_at,
       use_fc_pricing_base, closed_for_pricing_at, completed_at, completion_acknowledged_at,
       CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc','tc']) THEN tc_snapshot_hourly_rate ELSE NULL::numeric END AS tc_snapshot_hourly_rate,
       CASE WHEN co_viewer_role(id) = 'tc' THEN tc_snapshot_markup_percent ELSE NULL::numeric END AS tc_snapshot_markup_percent,
       CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc','tc']) THEN tc_submitted_price ELSE NULL::numeric END AS tc_submitted_price,
       fc_pricing_submitted_at,
       CASE WHEN co_viewer_role(id) = 'gc' THEN gc_budget ELSE NULL::numeric END AS gc_budget,
       co_material_responsible_override, co_equipment_responsible_override,
       assembly_state, trigger_code, document_type, withdrawn_at, withdrawn_reason,
       tax_rate_snapshot, labor_taxable_snapshot,
       CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc','tc']) THEN materials_tax ELSE NULL::numeric END AS materials_tax,
       CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc','tc']) THEN labor_tax ELSE NULL::numeric END AS labor_tax,
       CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc','tc']) THEN equipment_tax ELSE NULL::numeric END AS equipment_tax,
       CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc','tc']) THEN total_tax ELSE NULL::numeric END AS total_tax,
       owner_approval_status, owner_approved_at, owner_approver_name, owner_rejection_note,
       architect_approval_status, architect_approved_at, architect_approver_name, architect_rejection_note,
       CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc','tc']) THEN retainage_amount ELSE NULL::numeric END AS retainage_amount,
       retainage_released, retainage_released_at, blocked_by_rfi_id, entry_source,
       problem_summary, problem_voice_url, ai_intake_id, originating_org_id,
       CASE WHEN co_viewer_role(id) = 'gc' THEN gc_owner_markup_percent ELSE NULL::numeric END AS gc_owner_markup_percent,
       CASE WHEN co_viewer_role(id) = 'gc' THEN passed_to_owner ELSE NULL::boolean END AS passed_to_owner,
       CASE WHEN co_viewer_role(id) = 'gc' THEN not_passed_reason ELSE NULL::text END AS not_passed_reason,
       CASE WHEN co_viewer_role(id) = ANY (ARRAY['tc','fc']) THEN crew_approved_at ELSE NULL::timestamptz END AS crew_approved_at,
       CASE WHEN co_viewer_role(id) = ANY (ARRAY['tc','fc']) THEN crew_approved_by_user_id ELSE NULL::uuid END AS crew_approved_by_user_id,
       CASE WHEN co_viewer_role(id) = 'tc' THEN kept_internal ELSE false END AS kept_internal,
       CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc','tc']) THEN approved_amount ELSE NULL::numeric END AS approved_amount
FROM public.change_orders co;

CREATE OR REPLACE FUNCTION public.co_proposed_total(_co_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_result numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_change_order(_co_id) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;
  WITH base AS (
    SELECT id, project_id, use_fc_pricing_base, tc_submitted_price,
           co_material_responsible_override, materials_responsible,
           co_equipment_responsible_override, equipment_responsible
    FROM public.change_orders WHERE id = _co_id
  ),
  contract_default AS (
    SELECT pc.material_responsibility
    FROM public.project_contracts pc, base b
    WHERE pc.project_id = b.project_id AND pc.material_responsibility IS NOT NULL
    ORDER BY (COALESCE(pc.from_role, '') = 'Owner'), pc.created_at LIMIT 1
  ),
  co AS (
    SELECT b.use_fc_pricing_base, b.tc_submitted_price,
           COALESCE(b.co_material_responsible_override, b.materials_responsible,
                    (SELECT material_responsibility FROM contract_default), 'TC') AS mat_resp,
           COALESCE(b.co_equipment_responsible_override, b.equipment_responsible, 'TC') AS eq_resp
    FROM base b
  ),
  labor AS (
    SELECT COALESCE(SUM(CASE WHEN entered_by_role = 'TC' AND NOT is_actual_cost THEN line_total ELSE 0 END), 0) AS tc_labor,
           COALESCE(SUM(CASE WHEN NOT is_actual_cost THEN line_total ELSE 0 END), 0) AS all_labor
    FROM public.co_labor_entries WHERE co_id = _co_id
  ),
  mats AS (SELECT COALESCE(SUM(billed_amount), 0) AS total FROM public.co_material_items WHERE co_id = _co_id),
  eq AS (SELECT COALESCE(SUM(billed_amount), 0) AS total FROM public.co_equipment_items WHERE co_id = _co_id)
  SELECT CASE
      WHEN co.use_fc_pricing_base AND COALESCE(co.tc_submitted_price, 0) > 0 THEN co.tc_submitted_price
      WHEN labor.tc_labor > 0 THEN labor.tc_labor ELSE labor.all_labor END
    + CASE WHEN co.mat_resp = 'GC' THEN 0 ELSE mats.total END
    + CASE WHEN co.eq_resp = 'GC' THEN 0 ELSE eq.total END
  INTO v_result FROM co, labor, mats, eq;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.co_grand_total(_co_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_approved numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_change_order(_co_id) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;
  SELECT approved_amount INTO v_approved FROM public.change_orders WHERE id = _co_id;
  IF v_approved IS NOT NULL THEN RETURN v_approved; END IF;
  RETURN public.co_proposed_total(_co_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public._assert_co_line_reviewer(_co_id uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.change_orders c
    JOIN public.user_org_roles u ON u.user_id = auth.uid()
      AND u.organization_id IN (c.org_id, c.assigned_to_org_id)
    JOIN public.organizations o ON o.id = u.organization_id AND o.type = 'GC'
    LEFT JOIN public.member_permissions p ON p.user_org_role_id = u.id
    WHERE c.id = _co_id AND public.can_see_project(c.project_id)
      AND (u.is_admin OR COALESCE(p.can_approve_invoices, false))
  ) THEN
    RAISE EXCEPTION 'Only an authorized reviewing contractor can decide scope items' USING errcode = '42501';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_co_line_items(_co_id uuid, _decisions jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.change_orders; d jsonb; v_id uuid; v_decision text; v_reason text; v_name text;
BEGIN
  PERFORM public._assert_co_line_reviewer(_co_id);
  SELECT * INTO c FROM public.change_orders WHERE id = _co_id FOR UPDATE;
  IF c.status <> 'submitted' THEN RAISE EXCEPTION 'Item review is only available after submission'; END IF;
  IF jsonb_typeof(_decisions) <> 'array' OR jsonb_array_length(_decisions) = 0 THEN
    RAISE EXCEPTION 'Choose at least one item decision';
  END IF;
  PERFORM set_config('app.skip_co_correction', 'on', true);
  PERFORM set_config('app.co_line_decision', 'on', true);
  FOR d IN SELECT * FROM jsonb_array_elements(_decisions)
  LOOP
    v_id := (d->>'id')::uuid;
    v_decision := d->>'decision';
    v_reason := NULLIF(btrim(COALESCE(d->>'reason', '')), '');
    IF v_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid item decision'; END IF;
    IF v_decision = 'rejected' AND v_reason IS NULL THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;
    SELECT item_name INTO v_name FROM public.co_line_items WHERE id = v_id AND co_id = _co_id FOR UPDATE;
    IF v_name IS NULL THEN RAISE EXCEPTION 'Scope item does not belong to this order'; END IF;
    UPDATE public.co_line_items
    SET approval_status = v_decision,
        approval_rejection_reason = CASE WHEN v_decision = 'rejected' THEN v_reason ELSE NULL END,
        approval_decided_by = auth.uid(), approval_decided_at = now()
    WHERE id = v_id;
    INSERT INTO public.co_activity(co_id, project_id, actor_user_id, actor_role, action, detail)
    VALUES (_co_id, c.project_id, auth.uid(), 'GC', 'line_item_reviewed', v_name || ': ' || v_decision || COALESCE(' — ' || v_reason, ''));
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_co_line_review(_co_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  c public.change_orders; v_total integer; v_pending integer; v_approved integer; v_rejected integer;
  v_full_total numeric; v_full_tc numeric; v_full_all numeric; v_full_labor numeric;
  v_tc numeric; v_all numeric; v_labor numeric; v_amount numeric; v_note text; v_status text;
BEGIN
  PERFORM public._assert_co_line_reviewer(_co_id);
  SELECT * INTO c FROM public.change_orders WHERE id = _co_id FOR UPDATE;
  IF c.status <> 'submitted' THEN RAISE EXCEPTION 'This order review is already finalized'; END IF;
  SELECT count(*), count(*) FILTER (WHERE approval_status = 'pending'),
         count(*) FILTER (WHERE approval_status = 'approved'),
         count(*) FILTER (WHERE approval_status = 'rejected')
  INTO v_total, v_pending, v_approved, v_rejected
  FROM public.co_line_items WHERE co_id = _co_id;
  IF v_total = 0 THEN RAISE EXCEPTION 'Add at least one scope item before review'; END IF;
  IF v_pending > 0 THEN RAISE EXCEPTION 'Approve or reject every item before finishing the review'; END IF;

  v_full_total := public.co_proposed_total(_co_id);
  SELECT COALESCE(sum(CASE WHEN e.entered_by_role = 'TC' THEN e.line_total ELSE 0 END),0),
         COALESCE(sum(e.line_total),0)
  INTO v_full_tc, v_full_all FROM public.co_labor_entries e WHERE e.co_id = _co_id AND NOT e.is_actual_cost;
  v_full_labor := CASE WHEN c.use_fc_pricing_base AND COALESCE(c.tc_submitted_price,0) > 0 THEN c.tc_submitted_price
                       WHEN v_full_tc > 0 THEN v_full_tc ELSE v_full_all END;

  IF v_rejected = 0 THEN
    v_amount := v_full_total;
  ELSIF v_approved > 0 THEN
    SELECT COALESCE(sum(CASE WHEN e.entered_by_role = 'TC' THEN e.line_total ELSE 0 END),0),
           COALESCE(sum(e.line_total),0)
    INTO v_tc, v_all
    FROM public.co_labor_entries e
    JOIN public.co_line_items li ON li.id = e.co_line_item_id
    WHERE e.co_id = _co_id AND NOT e.is_actual_cost AND li.approval_status = 'approved';
    v_labor := CASE WHEN v_tc > 0 THEN v_tc ELSE v_all END;
    IF v_full_labor > 0 AND v_labor <= 0 THEN
      RAISE EXCEPTION 'Approved items need their own billable prices before a partial approval';
    END IF;
    v_amount := v_labor + GREATEST(v_full_total - v_full_labor, 0);
  ELSE
    v_amount := 0;
  END IF;

  v_status := CASE WHEN v_approved > 0 THEN 'approved' ELSE 'rejected' END;
  IF v_approved = 0 THEN
    SELECT string_agg(item_name || ': ' || approval_rejection_reason, E'\n' ORDER BY sort_order)
    INTO v_note FROM public.co_line_items WHERE co_id = _co_id;
  END IF;

  PERFORM set_config('app.skip_co_correction', 'on', true);
  PERFORM set_config('app.co_item_finalization', 'on', true);
  UPDATE public.change_orders
  SET status = v_status, approved_amount = round(v_amount,2),
      approved_at = CASE WHEN v_approved > 0 THEN now() ELSE NULL END,
      rejected_at = CASE WHEN v_approved = 0 THEN now() ELSE NULL END,
      rejection_note = v_note, updated_at = now()
  WHERE id = _co_id;

  RETURN jsonb_build_object('status',v_status,'approved_amount',round(v_amount,2),
    'approved_count',v_approved,'rejected_count',v_rejected);
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_co_line_decision_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.co_line_decision', true) <> 'on' THEN
    IF TG_OP = 'INSERT' AND (NEW.approval_status <> 'pending' OR NEW.approval_rejection_reason IS NOT NULL
       OR NEW.approval_decided_by IS NOT NULL OR NEW.approval_decided_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Item approval fields can only be changed through item review';
    ELSIF TG_OP = 'UPDATE' AND (NEW.approval_status IS DISTINCT FROM OLD.approval_status
       OR NEW.approval_rejection_reason IS DISTINCT FROM OLD.approval_rejection_reason
       OR NEW.approval_decided_by IS DISTINCT FROM OLD.approval_decided_by
       OR NEW.approval_decided_at IS DISTINCT FROM OLD.approval_decided_at) THEN
      RAISE EXCEPTION 'Item approval fields can only be changed through item review';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER guard_co_line_decision_fields
BEFORE INSERT OR UPDATE ON public.co_line_items
FOR EACH ROW EXECUTE FUNCTION public.guard_co_line_decision_fields();

CREATE OR REPLACE FUNCTION public.guard_multi_item_co_finalization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'submitted' AND NEW.status IN ('approved','rejected')
     AND current_setting('app.co_item_finalization', true) <> 'on'
     AND (SELECT count(*) FROM public.co_line_items WHERE co_id = NEW.id) > 1 THEN
    RAISE EXCEPTION 'Review each scope item before finalizing this order';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER guard_multi_item_co_finalization
BEFORE UPDATE OF status ON public.change_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_multi_item_co_finalization();

CREATE OR REPLACE FUNCTION public.reset_co_line_review_on_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' THEN
    NEW.approved_amount := NULL;
    PERFORM set_config('app.skip_co_correction', 'on', true);
    PERFORM set_config('app.co_line_decision', 'on', true);
    UPDATE public.co_line_items
    SET approval_status = 'pending', approval_rejection_reason = NULL,
        approval_decided_by = NULL, approval_decided_at = NULL
    WHERE co_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER reset_co_line_review_on_submit
BEFORE UPDATE OF status ON public.change_orders
FOR EACH ROW EXECUTE FUNCTION public.reset_co_line_review_on_submit();

REVOKE ALL ON FUNCTION public.co_proposed_total(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._assert_co_line_reviewer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_co_line_items(uuid,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finalize_co_line_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.co_proposed_total(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_co_line_items(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_co_line_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.co_grand_total(uuid) TO authenticated, service_role;