
-- Drop ALL RLS policies that depend on work_item_id columns

-- labor_entries policies
DROP POLICY IF EXISTS "FS can insert own labor entries" ON labor_entries;
DROP POLICY IF EXISTS "FS can update own labor entries" ON labor_entries;
DROP POLICY IF EXISTS "TC_PM can update labor entries" ON labor_entries;
DROP POLICY IF EXISTS "TC_PM can delete labor entries" ON labor_entries;
DROP POLICY IF EXISTS "TC_PM can view labor entries" ON labor_entries;
DROP VIEW IF EXISTS labor_entries_fs CASCADE;

-- material_orders policies
DROP POLICY IF EXISTS "PM and FS can create orders" ON material_orders;
DROP POLICY IF EXISTS "PM and FS can update draft orders" ON material_orders;
DROP POLICY IF EXISTS "GC_PM can update any order" ON material_orders;
DROP POLICY IF EXISTS "Members or participants can view orders" ON material_orders;

-- order_items policies (depend on material_orders.work_item_id)
DROP POLICY IF EXISTS "Users can view order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert order items for draft orders" ON order_items;
DROP POLICY IF EXISTS "Users can update order items for draft orders" ON order_items;
DROP POLICY IF EXISTS "Users can delete order items from draft orders" ON order_items;

-- Drop FK columns on external tables
ALTER TABLE actual_cost_entries DROP COLUMN IF EXISTS change_order_id CASCADE;
ALTER TABLE field_captures DROP COLUMN IF EXISTS converted_work_order_id CASCADE;
ALTER TABLE project_schedule_items DROP COLUMN IF EXISTS work_order_id CASCADE;
ALTER TABLE supplier_estimates DROP COLUMN IF EXISTS work_order_id CASCADE;
ALTER TABLE invoice_line_items DROP COLUMN IF EXISTS work_item_id CASCADE;
ALTER TABLE labor_entries DROP COLUMN IF EXISTS work_item_id CASCADE;
ALTER TABLE material_orders DROP COLUMN IF EXISTS work_item_id CASCADE;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS work_item_id CASCADE;

-- Drop Tier 1 leaf tables
DROP TABLE IF EXISTS change_order_checklist CASCADE;
DROP TABLE IF EXISTS change_order_equipment CASCADE;
DROP TABLE IF EXISTS change_order_fc_hours CASCADE;
DROP TABLE IF EXISTS change_order_materials CASCADE;
DROP TABLE IF EXISTS change_order_participants CASCADE;
DROP TABLE IF EXISTS change_order_tc_labor CASCADE;
DROP TABLE IF EXISTS change_work_pricing CASCADE;
DROP TABLE IF EXISTS work_item_participants CASCADE;
DROP TABLE IF EXISTS work_order_catalog CASCADE;
DROP TABLE IF EXISTS work_order_equipment CASCADE;
DROP TABLE IF EXISTS work_order_line_items CASCADE;
DROP TABLE IF EXISTS work_order_log_items CASCADE;
DROP TABLE IF EXISTS work_order_materials CASCADE;
DROP TABLE IF EXISTS work_order_tasks CASCADE;
DROP TABLE IF EXISTS tm_time_cards CASCADE;
DROP TABLE IF EXISTS tm_labor_entries CASCADE;
DROP TABLE IF EXISTS tm_material_entries CASCADE;
DROP TABLE IF EXISTS cost_rollups CASCADE;

-- Drop views
DROP VIEW IF EXISTS tm_periods_gc CASCADE;
DROP VIEW IF EXISTS tm_labor_entries_fs CASCADE;
DROP VIEW IF EXISTS tm_material_entries_fs CASCADE;

-- Drop tm_periods
DROP TABLE IF EXISTS tm_periods CASCADE;

-- Drop Tier 2 parent tables
DROP TABLE IF EXISTS change_order_projects CASCADE;
DROP TABLE IF EXISTS work_items CASCADE;

-- Drop database functions
DROP FUNCTION IF EXISTS execute_change_work(uuid);
DROP FUNCTION IF EXISTS generate_change_work_code(uuid);
DROP FUNCTION IF EXISTS approve_tm_period(uuid);
DROP FUNCTION IF EXISTS reject_tm_period(uuid);
DROP FUNCTION IF EXISTS submit_tm_period(uuid);

-- Drop labor_entries table entirely
DROP TABLE IF EXISTS labor_entries CASCADE;
