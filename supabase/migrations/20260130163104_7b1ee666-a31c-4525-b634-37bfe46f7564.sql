-- Complete Database Reset for Fresh Testing
-- This migration deletes ALL data from all tables

-- Disable triggers temporarily to avoid conflicts
SET session_replication_role = replica;

-- Delete child tables first (respecting foreign key constraints)

-- Change order related
DELETE FROM public.change_order_checklist;
DELETE FROM public.change_order_equipment;
DELETE FROM public.change_order_fc_hours;
DELETE FROM public.change_order_materials;
DELETE FROM public.change_order_tc_labor;
DELETE FROM public.change_order_participants;
DELETE FROM public.change_order_projects;

-- Work items
DELETE FROM public.work_item_participants;
DELETE FROM public.change_work_pricing;
DELETE FROM public.cost_rollups;
DELETE FROM public.labor_entries;
DELETE FROM public.supplier_quotes;
DELETE FROM public.work_items;

-- Invoices
DELETE FROM public.invoice_line_items;
DELETE FROM public.invoices;

-- Purchase orders and materials
DELETE FROM public.po_line_items;
DELETE FROM public.purchase_orders;
DELETE FROM public.order_items;
DELETE FROM public.material_orders;

-- Estimates and packs
DELETE FROM public.pack_items;
DELETE FROM public.estimate_packs;
DELETE FROM public.project_estimates;

-- Project related
DELETE FROM public.project_sov_items;
DELETE FROM public.project_sov;
DELETE FROM public.project_contracts;
DELETE FROM public.project_scope_details;
DELETE FROM public.project_activity;
DELETE FROM public.project_relationships;
DELETE FROM public.project_participants;
DELETE FROM public.project_invites;
DELETE FROM public.project_team;
DELETE FROM public.projects;

-- Notifications
DELETE FROM public.notification_reads;
DELETE FROM public.notifications;

-- Catalog and suppliers
DELETE FROM public.catalog_items;
DELETE FROM public.suppliers;

-- Organizations and users
DELETE FROM public.org_invitations;
DELETE FROM public.org_settings;
DELETE FROM public.user_org_roles;
DELETE FROM public.organizations;
DELETE FROM public.profiles;

-- Delete all auth users (this must be done last)
DELETE FROM auth.users;

-- Re-enable triggers
SET session_replication_role = DEFAULT;