

# Delete All Projects and Associated Data

## What this does
Removes all 5 projects and every piece of data linked to them from the database. This is a destructive, irreversible operation.

## Deletion strategy

Most child tables have `ON DELETE CASCADE`, so deleting from `projects` will automatically clean up ~18 tables. However, two tables use different FK behavior and must be handled first:

1. **`purchase_orders`** (`ON DELETE NO ACTION`) — 11 rows. Must delete these first, which will cascade to `po_line_items`. Need to also clear `invoice_line_items` referencing work_items and `return_items` referencing POs.
2. **`supplier_estimates`** (`ON DELETE SET NULL`) — 2 rows. These won't be deleted automatically; they'll just have `project_id` set to NULL, leaving orphan records.

## Execution order (single SQL transaction)

1. Delete `return_items` referencing POs in these projects
2. Delete `returns` in these projects
3. Delete `invoice_line_items` referencing work_items in these projects
4. Nullify `source_estimate_id` on POs referencing supplier_estimates in these projects
5. Delete `supplier_estimate_items`, `estimate_pdf_uploads`, `estimate_line_items`, `estimate_catalog_mapping` for supplier_estimates in these projects
6. Delete `supplier_estimates` in these projects
7. Delete `po_line_items` for POs in these projects
8. Delete `purchase_orders` in these projects
9. Delete from `projects` — cascades to all remaining child tables (project_team, project_invites, project_contracts, project_sov, project_sov_items, invoices, work_items, change_order_projects, project_participants, project_relationships, project_scope_details, project_activity, reminders, project_rfis, project_guests, project_designated_suppliers, project_estimates, estimate_catalog_mapping)

All done via the data insert tool (not migration), since this is a data operation, not a schema change.

