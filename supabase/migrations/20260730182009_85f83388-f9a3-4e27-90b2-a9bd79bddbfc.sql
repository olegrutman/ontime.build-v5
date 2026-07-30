-- STEP 1 — snapshots
create table if not exists public._phase3a_view_backup as
select viewname, definition from pg_views
where schemaname='public' and viewname like '%_role_view';

create table if not exists public._phase3a_grant_backup as
select table_name::text, grantee::text, privilege_type::text
from information_schema.role_table_grants
where table_schema='public'
  and table_name in ('change_orders','co_labor_entries','co_material_items',
                     'co_equipment_items','co_line_items');

alter table public._phase3a_view_backup enable row level security;
alter table public._phase3a_grant_backup enable row level security;

-- STEP 2.1 change_orders_role_view
create or replace view public.change_orders_role_view
with (security_invoker = on) as
SELECT id, org_id, project_id, created_by_user_id, created_by_role, co_number,
  title, status, pricing_type, nte_cap, nte_increase_requested,
  nte_increase_approved, reason, reason_note, location_tag, assigned_to_org_id,
  fc_input_needed, materials_needed, materials_on_site, equipment_needed,
  materials_responsible, equipment_responsible, shared_at, combined_at,
  combined_co_id, parent_co_id, submitted_at, approved_at, rejected_at,
  rejection_note, contracted_at, draft_shared_with_next, created_at, updated_at,
  use_fc_pricing_base, closed_for_pricing_at, completed_at,
  completion_acknowledged_at,
  CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc'::text,'tc'::text]) THEN tc_snapshot_hourly_rate ELSE NULL::numeric END AS tc_snapshot_hourly_rate,
  CASE WHEN co_viewer_role(id) = 'tc'::text THEN tc_snapshot_markup_percent ELSE NULL::numeric END AS tc_snapshot_markup_percent,
  CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc'::text,'tc'::text]) THEN tc_submitted_price ELSE NULL::numeric END AS tc_submitted_price,
  fc_pricing_submitted_at,
  CASE WHEN co_viewer_role(id) = 'gc'::text THEN gc_budget ELSE NULL::numeric END AS gc_budget,
  co_material_responsible_override, co_equipment_responsible_override,
  assembly_state, trigger_code, document_type, withdrawn_at, withdrawn_reason,
  CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc'::text,'tc'::text]) THEN tax_rate_snapshot ELSE NULL::numeric END AS tax_rate_snapshot,
  labor_taxable_snapshot, materials_tax, labor_tax, equipment_tax,
  CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc'::text,'tc'::text]) THEN total_tax ELSE NULL::numeric END AS total_tax,
  owner_approval_status, owner_approved_at, owner_approver_name,
  owner_rejection_note, architect_approval_status, architect_approved_at,
  architect_approver_name, architect_rejection_note,
  CASE WHEN co_viewer_role(id) = ANY (ARRAY['gc'::text,'tc'::text]) THEN retainage_amount ELSE NULL::numeric END AS retainage_amount,
  retainage_released, retainage_released_at, blocked_by_rfi_id, entry_source,
  problem_summary, problem_voice_url, ai_intake_id
FROM change_orders co;

-- STEP 2.2 co_labor_entries_role_view
create or replace view public.co_labor_entries_role_view
with (security_invoker = on) as
SELECT id, co_id, co_line_item_id, org_id, entered_by_role, entry_date,
  pricing_mode, hours,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text]) THEN hourly_rate ELSE NULL::numeric END AS hourly_rate,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text]) THEN lump_sum ELSE NULL::numeric END AS lump_sum,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text]) THEN line_total ELSE NULL::numeric END AS line_total,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text])
       THEN (CASE WHEN ((co_viewer_role(co_id) = 'gc'::text) AND (lower(entered_by_role) <> 'gc'::text)) THEN NULL::numeric ELSE base_hourly_rate END)
       ELSE NULL::numeric END AS base_hourly_rate,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text])
       THEN (CASE WHEN ((co_viewer_role(co_id) = 'gc'::text) AND (lower(entered_by_role) <> 'gc'::text)) THEN NULL::numeric ELSE base_lump_sum END)
       ELSE NULL::numeric END AS base_lump_sum,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text])
       THEN (CASE WHEN ((co_viewer_role(co_id) = 'gc'::text) AND (lower(entered_by_role) <> 'gc'::text)) THEN NULL::numeric ELSE markup_percent END)
       ELSE NULL::numeric END AS markup_percent,
  description, is_actual_cost, actual_cost_note, created_at, gc_approved,
  gc_approved_at
FROM co_labor_entries l;

-- STEP 2.3 co_material_items_role_view
create or replace view public.co_material_items_role_view
with (security_invoker = on) as
SELECT id, co_id, org_id, added_by_role, line_number, description, supplier_sku,
  quantity, uom,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text])
       THEN (CASE WHEN ((co_viewer_role(co_id) = 'gc'::text) AND (lower(COALESCE(added_by_role,''::text)) <> 'gc'::text)) THEN NULL::numeric ELSE unit_cost END)
       ELSE NULL::numeric END AS unit_cost,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text])
       THEN (CASE WHEN ((co_viewer_role(co_id) = 'gc'::text) AND (lower(COALESCE(added_by_role,''::text)) <> 'gc'::text)) THEN NULL::numeric ELSE line_cost END)
       ELSE NULL::numeric END AS line_cost,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text])
       THEN (CASE WHEN ((co_viewer_role(co_id) = 'gc'::text) AND (lower(COALESCE(added_by_role,''::text)) <> 'gc'::text)) THEN NULL::numeric ELSE markup_percent END)
       ELSE NULL::numeric END AS markup_percent,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text])
       THEN (CASE WHEN ((co_viewer_role(co_id) = 'gc'::text) AND (lower(COALESCE(added_by_role,''::text)) <> 'gc'::text)) THEN NULL::numeric ELSE markup_amount END)
       ELSE NULL::numeric END AS markup_amount,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text]) THEN billed_amount ELSE NULL::numeric END AS billed_amount,
  notes, is_on_site, created_at
FROM co_material_items m;

-- STEP 2.4 co_equipment_items_role_view
create or replace view public.co_equipment_items_role_view
with (security_invoker = on) as
SELECT id, co_id, org_id, added_by_role, description, duration_note,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text])
       THEN (CASE WHEN ((co_viewer_role(co_id) = 'gc'::text) AND (lower(COALESCE(added_by_role,''::text)) <> 'gc'::text)) THEN NULL::numeric ELSE cost END)
       ELSE NULL::numeric END AS cost,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text])
       THEN (CASE WHEN ((co_viewer_role(co_id) = 'gc'::text) AND (lower(COALESCE(added_by_role,''::text)) <> 'gc'::text)) THEN NULL::numeric ELSE markup_percent END)
       ELSE NULL::numeric END AS markup_percent,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text])
       THEN (CASE WHEN ((co_viewer_role(co_id) = 'gc'::text) AND (lower(COALESCE(added_by_role,''::text)) <> 'gc'::text)) THEN NULL::numeric ELSE markup_amount END)
       ELSE NULL::numeric END AS markup_amount,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text]) THEN billed_amount ELSE NULL::numeric END AS billed_amount,
  notes, created_at
FROM co_equipment_items e;

-- STEP 2.5 co_line_items_role_view
create or replace view public.co_line_items_role_view
with (security_invoker = on) as
SELECT id, co_id, org_id, created_by_role, catalog_item_id, item_name, division,
  category_name, unit, qty, sort_order, created_at, location_tag, reason,
  description, quantity_source, ai_confidence, ai_reasoning, task_index,
  pricing_mode, task_phase, pricing_type,
  CASE WHEN co_viewer_role(co_id) = ANY (ARRAY['gc'::text,'tc'::text]) THEN nte_cap ELSE NULL::numeric END AS nte_cap,
  source, scenario_id, group_key
FROM co_line_items;