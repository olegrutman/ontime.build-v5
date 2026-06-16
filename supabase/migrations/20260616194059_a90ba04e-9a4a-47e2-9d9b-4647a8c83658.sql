
-- ============================================================
-- Phase 1: Role-scoped visibility views (additive, no REVOKE)
-- ============================================================
-- Strategy: create *_role_view views that mask sensitive columns
-- based on viewer's organization type relative to the CO. App
-- migrates reads to these views behind the co_v4 flag. Base
-- tables stay untouched; REVOKE is deferred to Phase 7 cutover.
-- ============================================================

-- Helper: viewer role for a given CO ('gc' | 'tc' | 'fc' | 'none')
CREATE OR REPLACE FUNCTION public.co_viewer_role(_co_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_org_type text;
  v_co_org uuid;
  v_assigned uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 'none';
  END IF;

  SELECT created_by_user_id IS NOT NULL, org_id, assigned_to_org_id
    INTO v_assigned, v_co_org, v_assigned
  FROM public.change_orders
  WHERE id = _co_id;

  IF v_co_org IS NULL THEN
    RETURN 'none';
  END IF;

  SELECT uor.organization_id, o.type::text
    INTO v_org_id, v_org_type
  FROM public.user_org_roles uor
  JOIN public.organizations o ON o.id = uor.organization_id
  WHERE uor.user_id = v_uid
  ORDER BY uor.created_at
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN 'none';
  END IF;

  RETURN CASE lower(coalesce(v_org_type,''))
    WHEN 'gc' THEN 'gc'
    WHEN 'tc' THEN 'tc'
    WHEN 'fc' THEN 'fc'
    ELSE 'none'
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.co_viewer_role(uuid) TO authenticated;

-- ============================================================
-- change_orders_role_view
--   GC: hides nothing of GC's own budget; masks TC internal margin
--       snapshots (tc_snapshot_*).
--   TC: hides gc_budget (upstream-only).
--   FC: hides gc_budget, tc_submitted_price, and TC margin snapshots.
-- ============================================================
CREATE OR REPLACE VIEW public.change_orders_role_view
WITH (security_invoker=on) AS
SELECT
  co.id, co.org_id, co.project_id, co.created_by_user_id, co.created_by_role,
  co.co_number, co.title, co.status, co.pricing_type, co.nte_cap,
  co.nte_increase_requested, co.nte_increase_approved, co.reason, co.reason_note,
  co.location_tag, co.assigned_to_org_id, co.fc_input_needed, co.materials_needed,
  co.materials_on_site, co.equipment_needed, co.materials_responsible,
  co.equipment_responsible, co.shared_at, co.combined_at, co.combined_co_id,
  co.parent_co_id, co.submitted_at, co.approved_at, co.rejected_at,
  co.rejection_note, co.contracted_at, co.draft_shared_with_next,
  co.created_at, co.updated_at, co.use_fc_pricing_base, co.closed_for_pricing_at,
  co.completed_at, co.completion_acknowledged_at,
  CASE WHEN public.co_viewer_role(co.id) IN ('gc','tc') THEN co.tc_snapshot_hourly_rate END   AS tc_snapshot_hourly_rate,
  CASE WHEN public.co_viewer_role(co.id) = 'tc'           THEN co.tc_snapshot_markup_percent END AS tc_snapshot_markup_percent,
  CASE WHEN public.co_viewer_role(co.id) IN ('gc','tc') THEN co.tc_submitted_price END        AS tc_submitted_price,
  co.fc_pricing_submitted_at,
  CASE WHEN public.co_viewer_role(co.id) = 'gc'           THEN co.gc_budget END                AS gc_budget,
  co.co_material_responsible_override, co.co_equipment_responsible_override,
  co.assembly_state, co.trigger_code, co.document_type, co.withdrawn_at,
  co.withdrawn_reason, co.tax_rate_snapshot, co.labor_taxable_snapshot,
  co.materials_tax, co.labor_tax, co.equipment_tax, co.total_tax,
  co.owner_approval_status, co.owner_approved_at, co.owner_approver_name,
  co.owner_rejection_note, co.architect_approval_status, co.architect_approved_at,
  co.architect_approver_name, co.architect_rejection_note,
  co.retainage_amount, co.retainage_released, co.retainage_released_at,
  co.blocked_by_rfi_id, co.entry_source, co.problem_summary,
  co.problem_voice_url, co.ai_intake_id
FROM public.change_orders co;

GRANT SELECT ON public.change_orders_role_view TO authenticated;

-- ============================================================
-- co_line_items_role_view (no $ on line items today, pass-through)
-- ============================================================
CREATE OR REPLACE VIEW public.co_line_items_role_view
WITH (security_invoker=on) AS
SELECT * FROM public.co_line_items;

GRANT SELECT ON public.co_line_items_role_view TO authenticated;

-- ============================================================
-- co_labor_entries_role_view
--   GC: sees only what was entered_by_role = 'gc' or approved totals;
--       hides FC/TC raw hourly_rate + hours (internal cost).
--   TC: sees FC entries (cost basis) + own; hides nothing of own.
--   FC: only own entries (entered_by_role='fc').
-- ============================================================
CREATE OR REPLACE VIEW public.co_labor_entries_role_view
WITH (security_invoker=on) AS
SELECT
  l.id, l.co_id, l.co_line_item_id, l.org_id, l.entered_by_role, l.entry_date,
  l.pricing_mode,
  CASE
    WHEN public.co_viewer_role(l.co_id) = 'gc' AND lower(l.entered_by_role) <> 'gc' THEN NULL
    ELSE l.hours
  END AS hours,
  CASE
    WHEN public.co_viewer_role(l.co_id) = 'gc' AND lower(l.entered_by_role) <> 'gc' THEN NULL
    ELSE l.hourly_rate
  END AS hourly_rate,
  CASE
    WHEN public.co_viewer_role(l.co_id) = 'gc' AND lower(l.entered_by_role) <> 'gc' THEN NULL
    ELSE l.lump_sum
  END AS lump_sum,
  CASE
    WHEN public.co_viewer_role(l.co_id) = 'gc' AND lower(l.entered_by_role) <> 'gc' THEN NULL
    ELSE l.line_total
  END AS line_total,
  l.description, l.is_actual_cost, l.actual_cost_note, l.created_at,
  l.gc_approved, l.gc_approved_at
FROM public.co_labor_entries l;

GRANT SELECT ON public.co_labor_entries_role_view TO authenticated;

-- ============================================================
-- co_material_items_role_view
--   GC: sees billed_amount only; masks cost/unit_cost/markup_* (TC internal).
--   TC/FC: full visibility (TC owns the data, FC sees site/material status).
-- ============================================================
CREATE OR REPLACE VIEW public.co_material_items_role_view
WITH (security_invoker=on) AS
SELECT
  m.id, m.co_id, m.org_id, m.added_by_role, m.line_number, m.description,
  m.supplier_sku, m.quantity, m.uom,
  CASE WHEN public.co_viewer_role(m.co_id) = 'gc' AND lower(coalesce(m.added_by_role,'')) <> 'gc' THEN NULL ELSE m.unit_cost     END AS unit_cost,
  CASE WHEN public.co_viewer_role(m.co_id) = 'gc' AND lower(coalesce(m.added_by_role,'')) <> 'gc' THEN NULL ELSE m.line_cost     END AS line_cost,
  CASE WHEN public.co_viewer_role(m.co_id) = 'gc' AND lower(coalesce(m.added_by_role,'')) <> 'gc' THEN NULL ELSE m.markup_percent END AS markup_percent,
  CASE WHEN public.co_viewer_role(m.co_id) = 'gc' AND lower(coalesce(m.added_by_role,'')) <> 'gc' THEN NULL ELSE m.markup_amount  END AS markup_amount,
  m.billed_amount, m.notes, m.is_on_site, m.created_at
FROM public.co_material_items m;

GRANT SELECT ON public.co_material_items_role_view TO authenticated;

-- ============================================================
-- co_equipment_items_role_view (same masking pattern as materials)
-- ============================================================
CREATE OR REPLACE VIEW public.co_equipment_items_role_view
WITH (security_invoker=on) AS
SELECT
  e.id, e.co_id, e.org_id, e.added_by_role, e.description, e.duration_note,
  CASE WHEN public.co_viewer_role(e.co_id) = 'gc' AND lower(coalesce(e.added_by_role,'')) <> 'gc' THEN NULL ELSE e.cost           END AS cost,
  CASE WHEN public.co_viewer_role(e.co_id) = 'gc' AND lower(coalesce(e.added_by_role,'')) <> 'gc' THEN NULL ELSE e.markup_percent END AS markup_percent,
  CASE WHEN public.co_viewer_role(e.co_id) = 'gc' AND lower(coalesce(e.added_by_role,'')) <> 'gc' THEN NULL ELSE e.markup_amount  END AS markup_amount,
  e.billed_amount, e.notes, e.created_at
FROM public.co_equipment_items e;

GRANT SELECT ON public.co_equipment_items_role_view TO authenticated;
