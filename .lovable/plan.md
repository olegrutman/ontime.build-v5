

# Purge All Project Data for Clean Testing

## Overview
Delete all data from project-related tables in the correct order to respect foreign key constraints. This is a full data reset across projects, work orders, POs, invoices, RFIs, estimates, and suppliers.

## Deletion Order (respecting foreign keys)

The SQL migration will delete data in dependency order -- children first, then parents:

```sql
-- 1. Work order / change order children
DELETE FROM change_order_fc_hours;
DELETE FROM change_order_tc_labor;
DELETE FROM change_order_materials;
DELETE FROM change_order_equipment;
DELETE FROM change_order_checklist;
DELETE FROM change_order_participants;
DELETE FROM tm_periods;
DELETE FROM tm_labor_entries;
DELETE FROM tm_material_entries;

-- 2. Work orders themselves
DELETE FROM change_order_projects;

-- 3. RFIs
DELETE FROM project_rfis;

-- 4. Invoices (break linked_po_id references first)
UPDATE invoices SET linked_po_id = NULL WHERE linked_po_id IS NOT NULL;
DELETE FROM invoice_line_items;
DELETE FROM invoices;

-- 5. Purchase orders
DELETE FROM po_line_items;
DELETE FROM purchase_orders;

-- 6. SOV
DELETE FROM project_sov_items;
DELETE FROM project_sov;

-- 7. Estimates
DELETE FROM supplier_estimate_items;
DELETE FROM supplier_estimates;

-- 8. Contracts and relationships
DELETE FROM project_relationships;
DELETE FROM project_contracts;

-- 9. Project team and participants
DELETE FROM project_invites;
DELETE FROM project_team;
DELETE FROM project_participants;

-- 10. Notifications
DELETE FROM notifications;

-- 11. Reminders
DELETE FROM reminders;

-- 12. Projects
DELETE FROM projects;

-- 13. Suppliers
DELETE FROM suppliers;

-- 14. Supplier inventory (catalog items uploaded by suppliers)
DELETE FROM supplier_products;
```

## Important Notes

- This deletes ALL data across ALL projects -- not just the current one
- Organizations and user accounts are preserved so you can log back in
- Trusted partner relationships are preserved
- The catalog_items table (shared product catalog) is NOT deleted
- After running, the dashboard will be empty and ready for fresh testing

## Risk
- **Irreversible** -- all project data will be permanently removed from the test environment
- User accounts and org setup remain intact

