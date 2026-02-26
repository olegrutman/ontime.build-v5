
# Delete All Projects and Associated Data

## What This Does

Permanently deletes all 14 projects and every piece of data tied to them: work orders, invoices, purchase orders, estimates, RFIs, returns, change orders, SOV data, scope details, team assignments, contracts, and activity logs.

Your organizations, user accounts, profiles, and org team memberships are NOT touched.

## Technical Details

### Single Database Migration

One migration that runs `TRUNCATE ... CASCADE` on all project-related tables in the correct order:

**Tables being wiped (47 tables):**

- Change order sub-tables: `change_order_checklist`, `change_order_equipment`, `change_order_fc_hours`, `change_order_materials`, `change_order_participants`, `change_order_tc_labor`
- T&M tables: `tm_time_cards`, `tm_billable_slices`, `tm_labor_entries`, `tm_material_entries`, `tm_periods`
- Work item tables: `change_work_pricing`, `cost_rollups`, `work_item_participants`, `labor_entries`, `material_orders`, `supplier_quotes`, `order_items`, `work_items`, `change_order_projects`
- Invoice tables: `invoice_line_items`, `invoices`
- PO tables: `po_line_items`, `purchase_orders`
- Return tables: `return_items`, `returns`
- RFI: `project_rfis`
- Estimate tables: `estimate_catalog_mapping`, `estimate_line_items`, `estimate_packs`, `estimate_pdf_uploads`, `supplier_estimate_items`, `supplier_estimates`, `project_estimates`
- SOV tables: `project_sov_items`, `project_sov`
- Project core tables: `project_scope_details`, `project_activity`, `project_contracts`, `project_designated_suppliers`, `project_guests`, `project_invites`, `project_participants`, `project_relationships`, `project_team`, `reminders`, `projects`

**Tables NOT touched:**
- `profiles`, `organizations`, `user_org_roles`, `org_invitations`, `org_join_requests`, `org_settings`, `member_permissions`, `user_settings`
- `catalog_items`, `pack_items`, `sov_templates`, `suppliers`, `trades`, `trusted_partners`, `notifications`, `notification_reads`

No code changes needed -- this is a data-only operation.
