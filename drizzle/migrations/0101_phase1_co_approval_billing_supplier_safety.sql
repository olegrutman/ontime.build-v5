CREATE OR REPLACE FUNCTION public.set_co_nte_ceiling(_co_id uuid, _ceiling numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  c public.change_orders;
  v_total numeric;
BEGIN
  IF auth.uid() IS NULL OR _ceiling IS NULL OR _ceiling <= 0 THEN
    RAISE EXCEPTION 'Enter a Not-to-exceed ceiling greater than zero';
  END IF;
  SELECT * INTO c FROM public.change_orders WHERE id = _co_id FOR UPDATE;
  IF c.id IS NULL OR c.pricing_type <> 'nte' THEN RAISE EXCEPTION 'This order does not use Not-to-exceed pricing'; END IF;
  IF c.status NOT IN ('draft','shared','work_in_progress','closed_for_pricing','rejected') THEN
    RAISE EXCEPTION 'The ceiling is locked after submission; request an increase instead';
  END IF;
  IF NOT public.can_see_project(c.project_id) OR NOT EXISTS (
    SELECT 1 FROM public.user_org_roles r
    JOIN public.organizations o ON o.id = r.organization_id
    WHERE r.user_id = auth.uid() AND r.organization_id IN (c.org_id, c.assigned_to_org_id)
      AND o.type::text IN ('GC','TC')
  ) THEN RAISE EXCEPTION 'Only the owning or assigned contractor can set the ceiling' USING errcode = '42501'; END IF;
  v_total := public.co_proposed_total(_co_id);
  IF _ceiling + 0.005 < v_total THEN
    RAISE EXCEPTION 'The ceiling cannot be below the current billable actuals of $%', round(v_total, 2);
  END IF;
  PERFORM set_config('app.skip_co_correction', 'on', true);
  UPDATE public.change_orders SET nte_cap = round(_ceiling, 2), updated_at = now() WHERE id = _co_id;
  RETURN round(_ceiling, 2);
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_co_nte_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.pricing_type = 'nte'
     AND NEW.status IN ('submitted','approved','contracted')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND (NEW.nte_cap IS NULL OR NEW.nte_cap <= 0) THEN
    RAISE EXCEPTION 'Set a Not-to-exceed ceiling greater than zero before submission or approval';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER guard_co_nte_lifecycle
BEFORE UPDATE OF status ON public.change_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_co_nte_lifecycle();

CREATE OR REPLACE FUNCTION public.approve_change_order_atomic(
  _co_id uuid,
  _pass_to_owner boolean DEFAULT NULL,
  _owner_price numeric DEFAULT NULL,
  _owner_markup_percent numeric DEFAULT NULL,
  _not_passed_reason text DEFAULT NULL,
  _nte_cap numeric DEFAULT NULL,
  _backcharge_org_id uuid DEFAULT NULL,
  _backcharge_amount numeric DEFAULT NULL,
  _backcharge_responsible_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  c public.change_orders;
  v_actor_org uuid;
  v_line_count integer;
  v_cap numeric;
  v_total numeric;
  v_amount numeric;
  v_status text;
  v_review jsonb;
  v_retainage_pct numeric := 0;
  v_retainage numeric := 0;
  v_owner_price numeric;
  v_owner_markup numeric;
  v_backcharge numeric;
  v_bc_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized' USING errcode = '42501'; END IF;
  SELECT * INTO c FROM public.change_orders WHERE id = _co_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Change order not found'; END IF;

  SELECT r.organization_id INTO v_actor_org
  FROM public.user_org_roles r
  JOIN public.organizations o ON o.id = r.organization_id
  WHERE r.user_id = auth.uid() AND r.organization_id IN (c.org_id, c.assigned_to_org_id)
    AND o.type = 'GC'
  ORDER BY (r.organization_id = c.assigned_to_org_id) DESC
  LIMIT 1;
  IF v_actor_org IS NULL OR NOT public.can_see_project(c.project_id) THEN
    RAISE EXCEPTION 'Only the assigned General Contractor can approve this order' USING errcode = '42501';
  END IF;

  IF c.status IN ('approved','contracted','completed') AND c.approved_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'already_approved', true, 'status', c.status, 'approved_amount', COALESCE(c.approved_amount, public.co_grand_total(c.id)),
      'approved_at', c.approved_at, 'gc_budget', c.gc_budget, 'passed_to_owner', c.passed_to_owner,
      'retainage_amount', c.retainage_amount, 'backcharge_amount', NULL, 'backcharge_org_id', NULL
    );
  END IF;
  IF c.status <> 'submitted' THEN RAISE EXCEPTION 'Only a submitted order can be approved'; END IF;

  v_cap := COALESCE(_nte_cap, c.nte_cap);
  IF c.pricing_type = 'nte' AND (v_cap IS NULL OR v_cap <= 0) THEN
    RAISE EXCEPTION 'Set a Not-to-exceed ceiling greater than zero before approval';
  END IF;
  SELECT count(*) INTO v_line_count FROM public.co_line_items WHERE co_id = c.id;
  v_total := public.co_proposed_total(c.id);
  IF c.pricing_type = 'nte' AND v_line_count <= 1 AND v_total > v_cap + 0.005 THEN
    RAISE EXCEPTION 'Current billable actuals exceed the Not-to-exceed ceiling';
  END IF;

  PERFORM set_config('app.skip_co_correction', 'on', true);
  IF c.pricing_type = 'nte' AND c.nte_cap IS DISTINCT FROM round(v_cap, 2) THEN
    UPDATE public.change_orders SET nte_cap = round(v_cap, 2), updated_at = now() WHERE id = c.id;
  END IF;

  IF v_line_count > 1 THEN
    v_review := public.finalize_co_line_review(c.id);
    v_status := v_review ->> 'status';
    v_amount := COALESCE((v_review ->> 'approved_amount')::numeric, 0);
  ELSE
    v_status := 'approved';
    v_amount := round(v_total, 2);
    UPDATE public.change_orders
    SET status = 'approved', approved_at = now(), approved_amount = v_amount,
        rejected_at = NULL, rejection_note = NULL, updated_at = now()
    WHERE id = c.id;
  END IF;

  IF c.pricing_type = 'nte' AND v_status = 'approved' AND v_amount > v_cap + 0.005 THEN
    RAISE EXCEPTION 'Approved actuals exceed the Not-to-exceed ceiling';
  END IF;

  SELECT COALESCE(retainage_percent, 0) INTO v_retainage_pct FROM public.projects WHERE id = c.project_id;
  v_retainage := CASE WHEN v_status = 'approved' THEN round(v_amount * v_retainage_pct / 100, 2) ELSE 0 END;

  IF v_status = 'approved' AND _pass_to_owner IS NOT NULL THEN
    IF _pass_to_owner THEN
      IF _owner_price IS NOT NULL AND _owner_price > 0 THEN
        v_owner_price := round(_owner_price, 2);
      ELSIF _owner_markup_percent IS NOT NULL THEN
        v_owner_price := round(v_amount * (1 + _owner_markup_percent / 100), 2);
      ELSE
        RAISE EXCEPTION 'Enter a markup percent or owner price before approving';
      END IF;
      v_owner_markup := COALESCE(_owner_markup_percent,
        CASE WHEN v_amount > 0 THEN round(((v_owner_price - v_amount) / v_amount) * 100, 2) ELSE NULL END);
      UPDATE public.change_orders
      SET gc_budget = v_owner_price, gc_owner_markup_percent = v_owner_markup,
          passed_to_owner = true, not_passed_reason = NULL,
          retainage_amount = v_retainage, updated_at = now()
      WHERE id = c.id;
      INSERT INTO public.co_activity(co_id, project_id, actor_user_id, actor_role, action, detail, amount)
      VALUES (c.id, c.project_id, auth.uid(), 'GC', 'owner_price_set',
        'Passed to owner at $' || trim(to_char(v_owner_price, 'FM999999999990.00')), v_owner_price);
    ELSE
      UPDATE public.change_orders
      SET gc_budget = NULL, gc_owner_markup_percent = NULL, passed_to_owner = false,
          not_passed_reason = NULLIF(btrim(_not_passed_reason), ''),
          retainage_amount = v_retainage, updated_at = now()
      WHERE id = c.id;
      INSERT INTO public.co_activity(co_id, project_id, actor_user_id, actor_role, action, detail, amount)
      VALUES (c.id, c.project_id, auth.uid(), 'GC', 'owner_price_absorbed',
        'Not passed to owner' || CASE WHEN NULLIF(btrim(_not_passed_reason), '') IS NOT NULL THEN ': ' || btrim(_not_passed_reason) ELSE '' END,
        v_amount);
    END IF;
  ELSE
    UPDATE public.change_orders SET retainage_amount = v_retainage, updated_at = now() WHERE id = c.id;
  END IF;

  IF v_status = 'approved' AND c.reason = 'damaged_by_others' THEN
    v_backcharge := round(COALESCE(_backcharge_amount, v_amount), 2);
    INSERT INTO public.backcharges(
      project_id, source_co_id, responsible_org_id, responsible_party_name, amount, created_by_user_id
    )
    SELECT c.project_id, c.id, _backcharge_org_id, _backcharge_responsible_name, v_backcharge, auth.uid()
    WHERE NOT EXISTS (SELECT 1 FROM public.backcharges b WHERE b.source_co_id = c.id)
    RETURNING id INTO v_bc_id;
    IF v_bc_id IS NOT NULL THEN
      INSERT INTO public.co_activity(co_id, project_id, actor_user_id, actor_role, action, detail, amount)
      VALUES (c.id, c.project_id, auth.uid(), 'GC', 'backcharge_created',
        'Backcharge of $' || trim(to_char(v_backcharge, 'FM999999999990.00')), v_backcharge);
    ELSE
      v_backcharge := NULL;
    END IF;
  END IF;

  SELECT * INTO c FROM public.change_orders WHERE id = c.id;
  RETURN jsonb_build_object(
    'already_approved', false, 'status', c.status, 'approved_amount', COALESCE(c.approved_amount, v_amount),
    'approved_at', c.approved_at, 'gc_budget', c.gc_budget, 'passed_to_owner', c.passed_to_owner,
    'retainage_amount', c.retainage_amount,
    'backcharge_amount', v_backcharge, 'backcharge_org_id', CASE WHEN v_bc_id IS NOT NULL THEN _backcharge_org_id ELSE NULL END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_wo_billing_status(
  p_project_id uuid,
  p_org_id uuid,
  p_co_ids uuid[],
  p_direction text DEFAULT 'issued'
)
RETURNS TABLE(co_id uuid, billed numeric, draft numeric, entry_ids uuid[], legacy_fully_billed boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_in_org(auth.uid(), p_org_id) OR NOT public.can_see_project(p_project_id) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;
  IF p_direction NOT IN ('issued','received') THEN RAISE EXCEPTION 'Invalid billing direction'; END IF;

  RETURN QUERY
  WITH requested AS (
    SELECT DISTINCT unnest(COALESCE(p_co_ids, ARRAY[]::uuid[])) AS co_id
  ), scoped_contracts AS (
    SELECT pc.id FROM public.project_contracts pc
    WHERE pc.project_id = p_project_id
      AND CASE WHEN p_direction = 'issued' THEN pc.from_org_id = p_org_id ELSE pc.to_org_id = p_org_id END
  ), tracked_invoices AS (
    SELECT i.id, i.status, i.co_ids
    FROM public.invoices i
    JOIN scoped_contracts sc ON sc.id = i.contract_id
    WHERE i.project_id = p_project_id
      AND i.status NOT IN ('REJECTED','VOID','VOIDED')
  ), tagged_lines AS (
    SELECT ili.invoice_id, ili.source_co_id, ili.source_entry_ids, ili.current_billed, ili.description, ti.status
    FROM public.invoice_line_items ili
    JOIN tracked_invoices ti ON ti.id = ili.invoice_id
    WHERE ili.source_co_id = ANY(COALESCE(p_co_ids, ARRAY[]::uuid[]))
  ), totals AS (
    SELECT tl.source_co_id AS co_id,
      COALESCE(SUM(CASE WHEN tl.status <> 'DRAFT' AND tl.description !~* '^\s*(sales\s+)?tax(\s|\(|$)' THEN tl.current_billed ELSE 0 END), 0)::numeric AS billed,
      COALESCE(SUM(CASE WHEN tl.status = 'DRAFT' AND tl.description !~* '^\s*(sales\s+)?tax(\s|\(|$)' THEN tl.current_billed ELSE 0 END), 0)::numeric AS draft
    FROM tagged_lines tl GROUP BY tl.source_co_id
  ), entries AS (
    SELECT tl.source_co_id AS co_id, array_agg(DISTINCT e.entry_id) AS entry_ids
    FROM tagged_lines tl
    CROSS JOIN LATERAL unnest(COALESCE(tl.source_entry_ids, ARRAY[]::uuid[])) AS e(entry_id)
    GROUP BY tl.source_co_id
  ), legacy AS (
    SELECT DISTINCT legacy_co.id AS co_id
    FROM tracked_invoices ti
    CROSS JOIN LATERAL unnest(COALESCE(ti.co_ids, ARRAY[]::text[])) AS u(co_id_text)
    JOIN requested legacy_co ON legacy_co.co_id::text = u.co_id_text
    WHERE ti.status <> 'DRAFT'
      AND NOT EXISTS (SELECT 1 FROM tagged_lines tl WHERE tl.invoice_id = ti.id)
  )
  SELECT r.co_id,
    COALESCE(t.billed, 0)::numeric,
    COALESCE(t.draft, 0)::numeric,
    COALESCE(e.entry_ids, ARRAY[]::uuid[]),
    (l.co_id IS NOT NULL)
  FROM requested r
  LEFT JOIN totals t ON t.co_id = r.co_id
  LEFT JOIN entries e ON e.co_id = r.co_id
  LEFT JOIN legacy l ON l.co_id = r.co_id;
END;
$function$;

CREATE INDEX invoices_co_ids_gin ON public.invoices USING GIN (co_ids);
CREATE INDEX project_contracts_project_from_org ON public.project_contracts(project_id, from_org_id);
CREATE INDEX project_contracts_project_to_org ON public.project_contracts(project_id, to_org_id);

CREATE OR REPLACE FUNCTION public.resolve_co_material_pricing_owner(_co_id uuid, _actor_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  c public.change_orders;
  v_actor_type text;
  v_default text;
  v_responsible text;
BEGIN
  IF auth.uid() IS NULL OR _actor_org_id IS NULL OR NOT public.user_in_org(auth.uid(), _actor_org_id) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;
  SELECT * INTO c FROM public.change_orders WHERE id = _co_id;
  IF c.id IS NULL OR c.status = 'withdrawn' OR NOT public.can_access_change_order(_co_id) THEN
    RAISE EXCEPTION 'Change order is not available for material ordering';
  END IF;
  SELECT o.type::text INTO v_actor_type FROM public.organizations o WHERE o.id = _actor_org_id;
  SELECT pc.material_responsibility INTO v_default
  FROM public.project_contracts pc
  WHERE pc.project_id = c.project_id AND pc.material_responsibility IS NOT NULL
  ORDER BY (COALESCE(pc.from_role, '') = 'Owner'), pc.created_at
  LIMIT 1;
  v_responsible := COALESCE(c.co_material_responsible_override, c.materials_responsible, v_default, 'TC');
  IF (v_responsible = 'GC' AND v_actor_type <> 'GC') OR (v_responsible = 'TC' AND v_actor_type NOT IN ('TC','FC')) THEN
    RAISE EXCEPTION 'Only the company responsible for materials can create this purchase order';
  END IF;
  RETURN _actor_org_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_co_material_po_route()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_supplier_org uuid;
BEGIN
  IF NEW.source_change_order_id IS NULL THEN RETURN NEW; END IF;

  SELECT s.organization_id INTO v_supplier_org FROM public.suppliers s WHERE s.id = NEW.supplier_id;
  IF v_supplier_org IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.project_participants pp
    WHERE pp.project_id = NEW.project_id AND pp.organization_id = v_supplier_org
      AND pp.role = 'SUPPLIER' AND pp.invite_status = 'ACCEPTED'
  ) THEN
    RAISE EXCEPTION 'Add the supplier to this project and have them accept the invitation before creating or sending a pricing request';
  END IF;

  IF TG_OP = 'INSERT' OR NEW.pricing_owner_org_id IS DISTINCT FROM OLD.pricing_owner_org_id THEN
    PERFORM public.resolve_co_material_pricing_owner(NEW.source_change_order_id, NEW.pricing_owner_org_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER guard_co_material_po_route
BEFORE INSERT OR UPDATE OF status, supplier_id, project_id, pricing_owner_org_id, source_change_order_id ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_co_material_po_route();

REVOKE ALL ON FUNCTION public.set_co_nte_ceiling(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_change_order_atomic(uuid, boolean, numeric, numeric, text, numeric, uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_wo_billing_status(uuid, uuid, uuid[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_co_material_pricing_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_co_nte_ceiling(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_change_order_atomic(uuid, boolean, numeric, numeric, text, numeric, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_wo_billing_status(uuid, uuid, uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_co_material_pricing_owner(uuid, uuid) TO authenticated;