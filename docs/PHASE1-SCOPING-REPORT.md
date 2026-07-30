# Phase 1 — Per-User Project Scoping: Report

## A. Failed statements

None. All migration statements applied successfully.

## B. Backfill & verification

project_members rows after backfill: 49
Verification query rows (must be 0): 0
Users with project_scope <> 'org': 0
Orgs with default_project_scope <> 'org': 0

## C. RLS policies on project-scoped tables

awk: cmd. line:5: warning: escape sequence `\`' treated as plain ``'

### access_audit_log

- **audit_insert** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `(actor_id = auth.uid())`
- **audit_select** (SELECT, {authenticated})
  - USING: `user_in_org(auth.uid(), organization_id)`
  - WITH CHECK: `-`

### actual_cost_entries

- **Users can delete own org actual costs** (DELETE, {authenticated})
  - USING: `user_in_org(auth.uid(), organization_id)`
  - WITH CHECK: `-`
- **Users can delete own org cost entries** (DELETE, {authenticated})
  - USING: `(organization_id IN ( SELECT user_org_roles.organization_id`
  - WITH CHECK: ``

###    FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (user_org_roles.user_id = auth.uid())))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### actual_cost_entries

- **Users can insert own org actual costs** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `user_in_org(auth.uid(), organization_id)`
- **Users can insert own org cost entries** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `(organization_id IN ( SELECT user_org_roles.organization_id`

###    FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (user_org_roles.user_id = auth.uid())))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### actual_cost_entries

- **Users can update own org actual costs** (UPDATE, {authenticated})
  - USING: `user_in_org(auth.uid(), organization_id)`
  - WITH CHECK: `-`
- **Users can view own org actual costs** (SELECT, {authenticated})
  - USING: `user_in_org(auth.uid(), organization_id)`
  - WITH CHECK: `-`
- **Users can view own org cost entries** (SELECT, {authenticated})
  - USING: `(organization_id IN ( SELECT user_org_roles.organization_id`
  - WITH CHECK: ``

###    FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (user_org_roles.user_id = auth.uid())))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### backcharges

- **Authenticated users can create backcharges on their projects** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `((auth.uid() = created_by_user_id) AND is_project_participant(auth.uid(), project_id))`
- **Project participants can update backcharges** (UPDATE, {public})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`
- **Project participants can view backcharges** (SELECT, {public})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`

### change_orders

- **Assigned org can decide submitted change orders** (UPDATE, {authenticated})
  - USING: `((assigned_to_org_id IS NOT NULL) AND user_in_org(auth.uid(), assigned_to_org_id) AND (status = 'submitted'::text))`
  - WITH CHECK: `((assigned_to_org_id IS NOT NULL) AND user_in_org(auth.uid(), assigned_to_org_id) AND (status = ANY (ARRAY['submitted'::text, 'approved'::text, 'rejected'::text])))`
- **Assigned org can update approved change orders** (UPDATE, {authenticated})
  - USING: `((assigned_to_org_id IS NOT NULL) AND user_in_org(auth.uid(), assigned_to_org_id) AND (status = 'approved'::text))`
  - WITH CHECK: `((assigned_to_org_id IS NOT NULL) AND user_in_org(auth.uid(), assigned_to_org_id) AND (status = 'approved'::text))`
- **Assigned org can work active change orders** (UPDATE, {authenticated})
  - USING: `((assigned_to_org_id IS NOT NULL) AND user_in_org(auth.uid(), assigned_to_org_id) AND (status = ANY (ARRAY['draft'::text, 'shared'::text, 'rejected'::text, 'combined'::text, 'work_in_progress'::text, 'closed_for_pricing'::text, 'submitted'::text, 'approved'::text])))`
  - WITH CHECK: `((assigned_to_org_id IS NOT NULL) AND user_in_org(auth.uid(), assigned_to_org_id) AND (status = ANY (ARRAY['draft'::text, 'shared'::text, 'submitted'::text, 'rejected'::text, 'combined'::text, 'work_in_progress'::text, 'closed_for_pricing'::text, 'approved'::text])))`
- **CO deletable by authorized owner org in editable states** (DELETE, {authenticated})
  - USING: `can_delete_change_order(id, auth.uid())`
  - WITH CHECK: `-`
- **Owner org can update change orders** (UPDATE, {authenticated})
  - USING: `user_in_org(auth.uid(), org_id)`
  - WITH CHECK: `user_in_org(auth.uid(), org_id)`
- **Platform staff can update change orders** (UPDATE, {public})
  - USING: `is_platform_staff(auth.uid())`
  - WITH CHECK: `is_platform_staff(auth.uid())`
- **Platform users can view change orders** (SELECT, {authenticated})
  - USING: `is_platform_user(auth.uid())`
  - WITH CHECK: `-`
- **Users can access change orders they participate in** (SELECT, {authenticated})
  - USING: `can_access_change_order(id)`
  - WITH CHECK: `-`
- **Users can insert change orders for their org** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `user_in_org(auth.uid(), org_id)`
- **Users can select owned or assigned change orders (direct)** (SELECT, {authenticated})
  - USING: `(user_in_org(auth.uid(), org_id) OR ((assigned_to_org_id IS NOT NULL) AND user_in_org(auth.uid(), assigned_to_org_id)))`
  - WITH CHECK: `-`

### co_activity

- **Activity insertable by co participants** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `can_access_change_order(co_id)`
- **Activity readable by co participants** (SELECT, {authenticated})
  - USING: `can_access_change_order(co_id)`
  - WITH CHECK: `-`
- **Platform users can view co_activity** (SELECT, {authenticated})
  - USING: `is_platform_user(auth.uid())`
  - WITH CHECK: `-`

### co_ai_intakes

- **Creator can read own intakes** (SELECT, {authenticated})
  - USING: `(created_by = auth.uid())`
  - WITH CHECK: `-`
- **Creator inserts own intake** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `((created_by = auth.uid()) AND is_project_participant(project_id, auth.uid()))`
- **Creator updates own intake** (UPDATE, {authenticated})
  - USING: `(created_by = auth.uid())`
  - WITH CHECK: `(created_by = auth.uid())`
- **Project participants can read linked intakes** (SELECT, {authenticated})
  - USING: `((finalized_co_id IS NOT NULL) AND is_project_participant(project_id, auth.uid()))`
  - WITH CHECK: `-`

### co_sov_lines

- **Participants read CO SOV lines** (SELECT, {authenticated})
  - USING: `is_project_participant(project_id, auth.uid())`
  - WITH CHECK: `-`

### contract_scope_exclusions

- **Project participants can create scope exclusions** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `is_project_participant(auth.uid(), project_id)`
- **Project participants can delete scope exclusions** (DELETE, {authenticated})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`
- **Project participants can update scope exclusions** (UPDATE, {authenticated})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`
- **Project participants can view scope exclusions** (SELECT, {authenticated})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`

### contract_scope_selections

- **Project participants can create scope selections** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `is_project_participant(auth.uid(), project_id)`
- **Project participants can delete scope selections** (DELETE, {authenticated})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`
- **Project participants can update scope selections** (UPDATE, {authenticated})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`
- **Project participants can view scope selections** (SELECT, {authenticated})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`

### contract_sow_items

- **Project members can delete SOW items** (DELETE, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pp.project_id = contract_sow_items.project_id) AND (pp.organization_id IN ( SELECT uor.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles uor

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (uor.user_id = auth.uid()))))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### contract_sow_items

- **Project members can insert SOW items** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `(EXISTS ( SELECT 1`

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pp.project_id = contract_sow_items.project_id) AND (pp.organization_id IN ( SELECT uor.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles uor

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (uor.user_id = auth.uid()))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### contract_sow_items

- **Project members can update SOW items** (UPDATE, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pp.project_id = contract_sow_items.project_id) AND (pp.organization_id IN ( SELECT uor.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles uor

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (uor.user_id = auth.uid()))))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### contract_sow_items

- **Project members can view SOW items** (SELECT, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pp.project_id = contract_sow_items.project_id) AND (pp.organization_id IN ( SELECT uor.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles uor

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (uor.user_id = auth.uid()))))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### daily_logs

- **Users can insert daily logs for their projects** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `((created_by = auth.uid()) AND (EXISTS ( SELECT 1`

###    FROM (project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN user_org_roles uor ON ((uor.organization_id = pt.org_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = daily_logs.project_id) AND (uor.user_id = auth.uid())))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### daily_logs

- **Users can update their own daily logs** (UPDATE, {authenticated})
  - USING: `(created_by = auth.uid())`
  - WITH CHECK: `(created_by = auth.uid())`
- **Users can view daily logs for their projects** (SELECT, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM (project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN user_org_roles uor ON ((uor.organization_id = pt.org_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = daily_logs.project_id) AND (uor.user_id = auth.uid()))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### estimate_catalog_mapping

- **Project participants can view mappings** (SELECT, {public})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM (project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN user_org_roles uor ON ((uor.organization_id = pt.org_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = estimate_catalog_mapping.project_id) AND (uor.user_id = auth.uid()))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### estimate_catalog_mapping

- **Supplier org can manage own mappings** (ALL, {public})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM (supplier_estimates se

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN user_org_roles uor ON ((uor.organization_id = se.supplier_org_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((se.id = estimate_catalog_mapping.estimate_id) AND (uor.user_id = auth.uid()))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### field_captures

- **Project participants can view captures** (SELECT, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = field_captures.project_id) AND (pt.org_id IN ( SELECT uor.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles uor

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (uor.user_id = auth.uid()))))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### field_captures

- **Users can create own captures** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `(user_id = auth.uid())`
- **Users can update own captures** (UPDATE, {authenticated})
  - USING: `(user_id = auth.uid())`
  - WITH CHECK: `(user_id = auth.uid())`

### gc_owner_billings

- **GC members can delete their owner billings** (DELETE, {authenticated})
  - USING: `(is_project_participant(project_id, auth.uid()) AND user_is_gc_in_org(auth.uid(), gc_org_id))`
  - WITH CHECK: `-`
- **GC members can insert their owner billings** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `(is_project_participant(project_id, auth.uid()) AND user_is_gc_in_org(auth.uid(), gc_org_id))`
- **GC members can update their owner billings** (UPDATE, {authenticated})
  - USING: `(is_project_participant(project_id, auth.uid()) AND user_is_gc_in_org(auth.uid(), gc_org_id))`
  - WITH CHECK: `(is_project_participant(project_id, auth.uid()) AND user_is_gc_in_org(auth.uid(), gc_org_id))`
- **GC members can view their owner billings** (SELECT, {authenticated})
  - USING: `(is_project_participant(project_id, auth.uid()) AND user_is_gc_in_org(auth.uid(), gc_org_id))`
  - WITH CHECK: `-`

### invoices

- **Clients can update submitted invoices** (UPDATE, {authenticated})
  - USING: `((status = ANY (ARRAY['SUBMITTED'::text, 'APPROVED'::text])) AND ((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = invoices.contract_id) AND user_in_org(auth.uid(), pc.to_org_id)))) OR ((contract_id IS NULL) AND (po_id IS NOT NULL) AND (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM purchase_orders po

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((po.id = invoices.po_id) AND user_in_org(auth.uid(), po.organization_id)))))))

- **((status = ANY (ARRAY['APPROVED'::text, 'REJECTED'::text, 'PAID'::text])) AND ((EXISTS ( SELECT 1** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = invoices.contract_id) AND user_in_org(auth.uid(), pc.to_org_id)))) OR ((contract_id IS NULL) AND (po_id IS NOT NULL) AND (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM purchase_orders po

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((po.id = invoices.po_id) AND user_in_org(auth.uid(), po.organization_id)))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### invoices

- **Contractors can create invoices** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `((created_by = auth.uid()) AND ((EXISTS ( SELECT 1`

###    FROM project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = invoices.contract_id) AND user_in_org(auth.uid(), pc.from_org_id)))) OR ((contract_id IS NULL) AND (po_id IS NOT NULL) AND (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM (purchase_orders po

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN suppliers s ON ((s.id = po.supplier_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((po.id = invoices.po_id) AND user_in_org(auth.uid(), s.organization_id)))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### invoices

- **Contractors can create invoices for their contracts** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `(EXISTS ( SELECT 1`

###    FROM project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = invoices.contract_id) AND (pc.from_org_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### invoices

- **Contractors can delete draft invoices** (DELETE, {authenticated})
  - USING: `((status = 'DRAFT'::text) AND (created_by = auth.uid()) AND ((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = invoices.contract_id) AND user_in_org(auth.uid(), pc.from_org_id)))) OR ((contract_id IS NULL) AND (po_id IS NOT NULL) AND (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM (purchase_orders po

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN suppliers s ON ((s.id = po.supplier_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((po.id = invoices.po_id) AND user_in_org(auth.uid(), s.organization_id)))))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### invoices

- **Contractors can delete their draft invoices** (DELETE, {public})
  - USING: `((status = 'DRAFT'::text) AND (EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = invoices.contract_id) AND (pc.from_org_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid())))))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### invoices

- **Contractors can update draft invoices** (UPDATE, {authenticated})
  - USING: `((status = ANY (ARRAY['DRAFT'::text, 'REJECTED'::text])) AND ((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = invoices.contract_id) AND user_in_org(auth.uid(), pc.from_org_id)))) OR ((contract_id IS NULL) AND (po_id IS NOT NULL) AND (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM (purchase_orders po

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN suppliers s ON ((s.id = po.supplier_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((po.id = invoices.po_id) AND user_in_org(auth.uid(), s.organization_id)))))))

- **((status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text])) AND ((EXISTS ( SELECT 1** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = invoices.contract_id) AND user_in_org(auth.uid(), pc.from_org_id)))) OR ((contract_id IS NULL) AND (po_id IS NOT NULL) AND (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM (purchase_orders po

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN suppliers s ON ((s.id = po.supplier_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((po.id = invoices.po_id) AND user_in_org(auth.uid(), s.organization_id)))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### invoices

- **Platform users can view all invoices** (SELECT, {authenticated})
  - USING: `is_platform_user(auth.uid())`
  - WITH CHECK: `-`
- **Users can update invoices based on contract role** (UPDATE, {public})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = invoices.contract_id) AND (((pc.from_org_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))) AND (invoices.status = ANY (ARRAY['DRAFT'::text, 'REJECTED'::text]))) OR ((pc.to_org_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))) AND (invoices.status = ANY (ARRAY['SUBMITTED'::text, 'APPROVED'::text])))))))

- **(EXISTS ( SELECT 1** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = invoices.contract_id) AND (((pc.from_org_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))) AND (invoices.status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text]))) OR ((pc.to_org_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))) AND (invoices.status = ANY (ARRAY['APPROVED'::text, 'REJECTED'::text, 'PAID'::text])))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### invoices

- **Users can view invoices for their contracts** (SELECT, {public})
  - USING: `((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = invoices.contract_id) AND ((pc.from_org_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))) OR (pc.to_org_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))))))) OR ((contract_id IS NULL) AND (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pp.project_id = invoices.project_id) AND (pp.organization_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))))))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### payment_applications

- **Participants can create payment apps** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `is_project_participant(auth.uid(), project_id)`
- **Participants can update payment apps** (UPDATE, {authenticated})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`
- **Participants can view payment apps** (SELECT, {authenticated})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`

### project_activity

- **Authenticated users can insert activity for their projects** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `((auth.uid() IS NOT NULL) AND ((EXISTS ( SELECT 1`

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pp.project_id = project_activity.project_id) AND user_in_org(auth.uid(), pp.organization_id)))) OR (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_activity.project_id) AND user_in_org(auth.uid(), p.organization_id))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_activity

- **Project participants can view activity** (SELECT, {public})
  - USING: `((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pp.project_id = project_activity.project_id) AND user_in_org(auth.uid(), pp.organization_id)))) OR (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_activity.project_id) AND user_in_org(auth.uid(), p.organization_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_contracts

- **Contract party members can update contracts** (UPDATE, {public})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((user_org_roles.user_id = auth.uid()) AND ((user_org_roles.organization_id = project_contracts.from_org_id) OR (user_org_roles.organization_id = project_contracts.to_org_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_contracts

- **Platform users can view all contracts** (SELECT, {public})
  - USING: `is_platform_user(auth.uid())`
  - WITH CHECK: `-`
- **Project creators can delete contracts** (DELETE, {public})
  - USING: `(project_id IN ( SELECT projects.id`
  - WITH CHECK: ``

###    FROM projects

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (projects.created_by = auth.uid())))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_contracts

- **Project members can insert contracts** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `((project_id IN ( SELECT projects.id`

###    FROM projects

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (projects.created_by = auth.uid()))) OR (project_id IN ( SELECT project_participants.project_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_participants

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (project_participants.organization_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_contracts

- **Users can view their organization's contracts** (SELECT, {public})
  - USING: `((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM user_org_roles uor

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((uor.user_id = auth.uid()) AND (uor.organization_id = project_contracts.from_org_id)))) OR (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM user_org_roles uor

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((uor.user_id = auth.uid()) AND (uor.organization_id = project_contracts.to_org_id)))) OR (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_contracts.project_id) AND (p.created_by = auth.uid())))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_designated_suppliers

- **GC TC can delete designated suppliers** (DELETE, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM (project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN user_org_roles uor ON ((uor.organization_id = pt.org_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = project_designated_suppliers.project_id) AND (uor.user_id = auth.uid()) AND (pt.role = ANY (ARRAY['General Contractor'::text, 'Trade Contractor'::text])) AND (pt.status = 'Accepted'::text))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_designated_suppliers

- **GC TC can designate suppliers** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `(EXISTS ( SELECT 1`

###    FROM (project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN user_org_roles uor ON ((uor.organization_id = pt.org_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = project_designated_suppliers.project_id) AND (uor.user_id = auth.uid()) AND (pt.role = ANY (ARRAY['General Contractor'::text, 'Trade Contractor'::text])) AND (pt.status = 'Accepted'::text))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_designated_suppliers

- **GC TC can update designated suppliers** (UPDATE, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM (project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN user_org_roles uor ON ((uor.organization_id = pt.org_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = project_designated_suppliers.project_id) AND (uor.user_id = auth.uid()) AND (pt.role = ANY (ARRAY['General Contractor'::text, 'Trade Contractor'::text])) AND (pt.status = 'Accepted'::text))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_designated_suppliers

- **Project participants can view designated suppliers** (SELECT, {authenticated})
  - USING: `((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = project_designated_suppliers.project_id) AND (pt.org_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid())))))) OR (user_id = auth.uid()))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_estimates

- **GC_PM can update estimates for approval** (UPDATE, {public})
  - USING: `(is_gc_pm(auth.uid()) AND (EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_estimates.project_id) AND user_in_org(auth.uid(), p.organization_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_estimates

- **PMs can view estimates** (SELECT, {public})
  - USING: `(is_pm_role(auth.uid()) AND (EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_estimates.project_id) AND user_in_org(auth.uid(), p.organization_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_estimates

- **SUPPLIER can create estimates** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `(has_role(auth.uid(), 'SUPPLIER'::app_role) AND (EXISTS ( SELECT 1`

###    FROM suppliers s

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((s.id = project_estimates.supplier_id) AND user_in_org(auth.uid(), s.organization_id)))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_estimates

- **SUPPLIER can update own draft estimates** (UPDATE, {public})
  - USING: `(has_role(auth.uid(), 'SUPPLIER'::app_role) AND (status = 'DRAFT'::estimate_status) AND (EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM suppliers s

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((s.id = project_estimates.supplier_id) AND user_in_org(auth.uid(), s.organization_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_estimates

- **SUPPLIER can view own estimates** (SELECT, {public})
  - USING: `(has_role(auth.uid(), 'SUPPLIER'::app_role) AND (EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM suppliers s

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((s.id = project_estimates.supplier_id) AND user_in_org(auth.uid(), s.organization_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_framing_scope

- **Team members can insert framing scope** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `(project_id IN ( SELECT pt.project_id`

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (pt.user_id = auth.uid())))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_framing_scope

- **Team members can read framing scope** (SELECT, {authenticated})
  - USING: `(project_id IN ( SELECT pt.project_id`
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (pt.user_id = auth.uid())))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_framing_scope

- **Team members can update framing scope** (UPDATE, {authenticated})
  - USING: `(project_id IN ( SELECT pt.project_id`
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (pt.user_id = auth.uid())))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_guests

- **Project admins can delete guests** (DELETE, {public})
  - USING: `(get_project_access_level(auth.uid(), project_id) = ANY (ARRAY['Owner'::text, 'Admin'::text]))`
  - WITH CHECK: `-`
- **Project admins can manage guests** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `(get_project_access_level(auth.uid(), project_id) = ANY (ARRAY['Owner'::text, 'Admin'::text]))`
- **Project admins can update guests** (UPDATE, {public})
  - USING: `(get_project_access_level(auth.uid(), project_id) = ANY (ARRAY['Owner'::text, 'Admin'::text]))`
  - WITH CHECK: `-`
- **Project team can view guests** (SELECT, {public})
  - USING: `has_project_access(auth.uid(), project_id)`
  - WITH CHECK: `-`

### project_invites

- **Project creators can delete invites** (DELETE, {public})
  - USING: `((invited_by_user_id = auth.uid()) OR (project_id IN ( SELECT projects.id`
  - WITH CHECK: ``

###    FROM projects

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (projects.created_by = auth.uid()))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_invites

- **Project members can insert invites** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `((project_id IN ( SELECT projects.id`

###    FROM projects

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (projects.created_by = auth.uid()))) OR (project_id IN ( SELECT project_participants.project_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_participants

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (project_participants.organization_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_invites

- **Users can update invites they received** (UPDATE, {authenticated})
  - USING: `(invited_email IN ( SELECT profiles.email`
  - WITH CHECK: ``

###    FROM profiles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (profiles.user_id = auth.uid())))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_invites

- **Users can view invites** (SELECT, {authenticated})
  - USING: `((invited_email IN ( SELECT profiles.email`
  - WITH CHECK: ``

###    FROM profiles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (profiles.user_id = auth.uid()))) OR (invited_by_user_id = auth.uid()))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_members

- **pm_select** (SELECT, {authenticated})
  - USING: `((user_id = auth.uid()) OR can_see_project(project_id))`
  - WITH CHECK: `-`
- **pm_write** (ALL, {authenticated})
  - USING: `can_see_project(project_id)`
  - WITH CHECK: `can_see_project(project_id)`

### project_participants

- **Accepted participants can view co-participants** (SELECT, {authenticated})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`
- **Invited org PM can accept/decline** (UPDATE, {public})
  - USING: `(is_pm_role(auth.uid()) AND user_in_org(auth.uid(), organization_id))`
  - WITH CHECK: `-`
- **Invited org can view their participation** (SELECT, {public})
  - USING: `user_in_org(auth.uid(), organization_id)`
  - WITH CHECK: `-`
- **PM roles can delete participants** (DELETE, {public})
  - USING: `(is_pm_role(auth.uid()) AND (EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_participants.project_id) AND user_in_org(auth.uid(), p.organization_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_participants

- **PM roles can update participants** (UPDATE, {public})
  - USING: `(is_pm_role(auth.uid()) AND ((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_participants.project_id) AND user_in_org(auth.uid(), p.organization_id)))) OR user_in_org(auth.uid(), organization_id)))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_participants

- **Project creators can add participants** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `(is_pm_role(auth.uid()) AND (invited_by = auth.uid()) AND (EXISTS ( SELECT 1`

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_participants.project_id) AND user_in_org(auth.uid(), p.organization_id)))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_participants

- **Users can view their participation** (SELECT, {public})
  - USING: `(user_in_org(auth.uid(), organization_id) OR (EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_participants.project_id) AND user_in_org(auth.uid(), p.organization_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_profiles

- **Project team can manage profile** (ALL, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = project_profiles.project_id) AND (pt.user_id = auth.uid()) AND (pt.status = 'Accepted'::text))))

- **(EXISTS ( SELECT 1** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = project_profiles.project_id) AND (pt.user_id = auth.uid()) AND (pt.status = 'Accepted'::text))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_relationships

- **GC_PM can create project relationships** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `(is_gc_pm(auth.uid()) AND (EXISTS ( SELECT 1`

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_relationships.project_id) AND user_in_org(auth.uid(), p.organization_id)))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_relationships

- **GC_PM can delete project relationships** (DELETE, {public})
  - USING: `(is_gc_pm(auth.uid()) AND (EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_relationships.project_id) AND user_in_org(auth.uid(), p.organization_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_relationships

- **GC_PM can update project relationships** (UPDATE, {public})
  - USING: `(is_gc_pm(auth.uid()) AND (EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_relationships.project_id) AND user_in_org(auth.uid(), p.organization_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_relationships

- **Participants can view project relationships** (SELECT, {public})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (((pp.id = project_relationships.upstream_participant_id) OR (pp.id = project_relationships.downstream_participant_id)) AND user_in_org(auth.uid(), pp.organization_id))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_rfis

- **Project members can create RFIs** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `(has_project_access(auth.uid(), project_id) AND (submitted_by_user_id = auth.uid()))`
- **Project team members can update RFIs** (UPDATE, {public})
  - USING: `has_project_access(auth.uid(), project_id)`
  - WITH CHECK: `-`
- **Users can view RFIs on their projects** (SELECT, {authenticated})
  - USING: `has_project_access(auth.uid(), project_id)`
  - WITH CHECK: `-`

### project_schedule_items

- **Team members can delete schedule** (DELETE, {authenticated})
  - USING: `(project_id IN ( SELECT pt.project_id`
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (pt.user_id = auth.uid())))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_schedule_items

- **Team members can insert schedule** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `(project_id IN ( SELECT pt.project_id`

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (pt.user_id = auth.uid())))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_schedule_items

- **Team members can update schedule** (UPDATE, {authenticated})
  - USING: `(project_id IN ( SELECT pt.project_id`
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (pt.user_id = auth.uid())))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_schedule_items

- **Team members can view schedule** (SELECT, {authenticated})
  - USING: `(project_id IN ( SELECT pt.project_id`
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (pt.user_id = auth.uid())))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_scope_assignments

- **Team members can manage scope assignments** (ALL, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = project_scope_assignments.project_id) AND (pt.user_id = auth.uid()) AND (pt.status = 'Accepted'::text))))

- **(EXISTS ( SELECT 1** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = project_scope_assignments.project_id) AND (pt.user_id = auth.uid()) AND (pt.status = 'Accepted'::text))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_scope_assignments

- **Team members can view scope assignments** (SELECT, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = project_scope_assignments.project_id) AND (pt.user_id = auth.uid()) AND (pt.status = 'Accepted'::text))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_scope_details

- **Project members can insert scope** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `(is_pm_role(auth.uid()) AND ((project_id IN ( SELECT projects.id`

###    FROM projects

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (projects.created_by = auth.uid()))) OR user_is_project_participant(auth.uid(), project_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_scope_details

- **Project members can update scope** (UPDATE, {public})
  - USING: `(is_pm_role(auth.uid()) AND ((project_id IN ( SELECT projects.id`
  - WITH CHECK: ``

###    FROM projects

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (projects.created_by = auth.uid()))) OR user_is_project_participant(auth.uid(), project_id)))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_scope_details

- **Users can view scope for their projects** (SELECT, {authenticated})
  - USING: `((project_id IN ( SELECT project_participants.project_id`
  - WITH CHECK: ``

###    FROM project_participants

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (project_participants.organization_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))))) OR (project_id IN ( SELECT projects.id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM projects

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (projects.created_by = auth.uid()))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_scope_selections

- **Project creator can manage selections** (ALL, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_scope_selections.project_id) AND (p.organization_id IN ( SELECT uor.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles uor

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (uor.user_id = auth.uid()))))))

- **(EXISTS ( SELECT 1** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_scope_selections.project_id) AND (p.organization_id IN ( SELECT uor.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles uor

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (uor.user_id = auth.uid()))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_scope_selections

- **Project participants can view selections** (SELECT, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = project_scope_selections.project_id) AND (pt.user_id = auth.uid()))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_settings_audit

- **Org members can view audit for their projects** (SELECT, {authenticated})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_settings_audit.project_id) AND user_in_org(auth.uid(), p.organization_id))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_setup_answers

- **Project participants can insert answers** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `(project_id IN ( SELECT pp.project_id`

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (pp.organization_id IN ( SELECT uor.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles uor

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (uor.user_id = auth.uid())))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_setup_answers

- **Project participants can read answers** (SELECT, {authenticated})
  - USING: `(project_id IN ( SELECT pp.project_id`
  - WITH CHECK: ``

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (pp.organization_id IN ( SELECT uor.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles uor

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (uor.user_id = auth.uid())))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_setup_answers

- **Project participants can update answers** (UPDATE, {authenticated})
  - USING: `(project_id IN ( SELECT pp.project_id`
  - WITH CHECK: ``

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (pp.organization_id IN ( SELECT uor.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles uor

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (uor.user_id = auth.uid())))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_sov

- **Contract members can update project SOV** (UPDATE, {authenticated})
  - USING: `((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM (project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN user_org_roles uor ON (((uor.organization_id = pc.from_org_id) OR (uor.organization_id = pc.to_org_id))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = project_sov.contract_id) AND (uor.user_id = auth.uid())))) OR ((contract_id IS NULL) AND (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_sov.project_id) AND ((p.created_by = auth.uid()) OR user_in_org(auth.uid(), p.organization_id)))))))

- **((EXISTS ( SELECT 1** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM (project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN user_org_roles uor ON (((uor.organization_id = pc.from_org_id) OR (uor.organization_id = pc.to_org_id))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = project_sov.contract_id) AND (uor.user_id = auth.uid())))) OR ((contract_id IS NULL) AND (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_sov.project_id) AND ((p.created_by = auth.uid()) OR user_in_org(auth.uid(), p.organization_id)))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_sov

- **Platform users can view all project SOV** (SELECT, {authenticated})
  - USING: `is_platform_user(auth.uid())`
  - WITH CHECK: `-`
- **Project members can create project SOV** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `((EXISTS ( SELECT 1`

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_sov.project_id) AND ((p.created_by = auth.uid()) OR user_in_org(auth.uid(), p.organization_id))))) OR (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pp.project_id = project_sov.project_id) AND user_in_org(auth.uid(), pp.organization_id)))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_sov

- **Project members can delete project SOV** (DELETE, {public})
  - USING: `(EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_sov.project_id) AND ((p.created_by = auth.uid()) OR user_in_org(auth.uid(), p.organization_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_sov

- **Users can view SOV for their contracts** (SELECT, {public})
  - USING: `((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM (project_contracts pc

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN user_org_roles uor ON (((uor.organization_id = pc.from_org_id) OR (uor.organization_id = pc.to_org_id))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pc.id = project_sov.contract_id) AND (uor.user_id = auth.uid())))) OR ((contract_id IS NULL) AND (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_sov.project_id) AND ((p.created_by = auth.uid()) OR user_in_org(auth.uid(), p.organization_id)))))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_sov_items

- **Platform users can update SOV item names** (UPDATE, {authenticated})
  - USING: `is_platform_user(auth.uid())`
  - WITH CHECK: `is_platform_user(auth.uid())`
- **Platform users can view all project SOV items** (SELECT, {authenticated})
  - USING: `is_platform_user(auth.uid())`
  - WITH CHECK: `-`
- **Project members can delete SOV items** (DELETE, {public})
  - USING: `((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_sov_items.project_id) AND ((p.created_by = auth.uid()) OR user_in_org(auth.uid(), p.organization_id))))) OR (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pp.project_id = project_sov_items.project_id) AND user_in_org(auth.uid(), pp.organization_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_sov_items

- **Project members can insert SOV items** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `((EXISTS ( SELECT 1`

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_sov_items.project_id) AND ((p.created_by = auth.uid()) OR user_in_org(auth.uid(), p.organization_id))))) OR (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pp.project_id = project_sov_items.project_id) AND user_in_org(auth.uid(), pp.organization_id)))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_sov_items

- **Project members can update SOV items** (UPDATE, {public})
  - USING: `((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM projects p

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((p.id = project_sov_items.project_id) AND ((p.created_by = auth.uid()) OR user_in_org(auth.uid(), p.organization_id))))) OR (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_participants pp

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pp.project_id = project_sov_items.project_id) AND user_in_org(auth.uid(), pp.organization_id)))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_sov_items

- **Users can view SOV items for their contracts** (SELECT, {public})
  - USING: `((EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM ((project_sov ps

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN project_contracts pc ON ((pc.id = ps.contract_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN user_org_roles uor ON (((uor.organization_id = pc.from_org_id) OR (uor.organization_id = pc.to_org_id))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((ps.id = project_sov_items.sov_id) AND (uor.user_id = auth.uid())))) OR (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM (project_sov ps

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###      JOIN projects p ON ((p.id = ps.project_id)))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((ps.id = project_sov_items.sov_id) AND (ps.contract_id IS NULL) AND ((p.created_by = auth.uid()) OR user_in_org(auth.uid(), p.organization_id))))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_team

- **Platform users can view all project_team** (SELECT, {authenticated})
  - USING: `is_platform_user(auth.uid())`
  - WITH CHECK: `-`
- **Project creators can delete team members** (DELETE, {public})
  - USING: `((project_id IN ( SELECT projects.id`
  - WITH CHECK: ``

###    FROM projects

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (projects.created_by = auth.uid()))) OR (project_id IN ( SELECT project_participants.project_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_participants

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (project_participants.organization_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_team

- **Project creators can insert team members** (INSERT, {authenticated})
  - USING: `-`
  - WITH CHECK: `((project_id IN ( SELECT projects.id`

###    FROM projects

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (projects.created_by = auth.uid()))) OR (project_id IN ( SELECT project_participants.project_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_participants

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (project_participants.organization_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid()))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### project_team

- **Project creators can update team members** (UPDATE, {authenticated})
  - USING: `((project_id IN ( SELECT projects.id`
  - WITH CHECK: ``

###    FROM projects

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (projects.created_by = auth.uid()))) OR (invited_email IN ( SELECT profiles.email

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM profiles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (profiles.id = auth.uid()))) OR (user_id = auth.uid()))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### project_team

- **Users can view project team** (SELECT, {public})
  - USING: `(user_is_project_participant(auth.uid(), project_id) OR (invited_email IN ( SELECT profiles.email`
  - WITH CHECK: ``

###    FROM profiles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (profiles.user_id = auth.uid()))) OR (invited_by_user_id = auth.uid()) OR (user_id = auth.uid()) OR (project_id IN ( SELECT projects.id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM projects

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (projects.created_by = auth.uid()))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### projects

- **Org members can view own projects** (SELECT, {public})
  - USING: `user_in_org(auth.uid(), organization_id)`
  - WITH CHECK: `-`
- **PM roles can create projects** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `(is_pm_role(auth.uid()) AND (organization_id = get_user_org_id(auth.uid())) AND (created_by = auth.uid()))`
- **PM roles can delete draft projects** (DELETE, {public})
  - USING: `(is_pm_role(auth.uid()) AND (organization_id = get_user_org_id(auth.uid())) AND (status = 'draft'::text))`
  - WITH CHECK: `-`
- **PM roles can update projects** (UPDATE, {public})
  - USING: `(is_pm_role(auth.uid()) AND (organization_id = get_user_org_id(auth.uid())))`
  - WITH CHECK: `-`
- **Participants can view invited projects** (SELECT, {public})
  - USING: `user_is_project_participant(auth.uid(), id)`
  - WITH CHECK: `-`
- **Platform users can view all projects** (SELECT, {authenticated})
  - USING: `is_platform_user(auth.uid())`
  - WITH CHECK: `-`

### purchase_orders

- **GC_PM can delete active POs** (DELETE, {public})
  - USING: `(is_pm_role(auth.uid()) AND user_in_org(auth.uid(), organization_id))`
  - WITH CHECK: `-`
- **GC_PM can update any PO** (UPDATE, {public})
  - USING: `(is_pm_role(auth.uid()) AND user_in_org(auth.uid(), organization_id))`
  - WITH CHECK: `-`
- **PM roles can create POs** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `(is_pm_role(auth.uid()) AND user_in_org(auth.uid(), organization_id))`
- **PM roles can update active POs** (UPDATE, {public})
  - USING: `(is_pm_role(auth.uid()) AND user_in_org(auth.uid(), organization_id))`
  - WITH CHECK: `-`
- **Platform users can view all purchase_orders** (SELECT, {authenticated})
  - USING: `is_platform_user(auth.uid())`
  - WITH CHECK: `-`
- **Pricing owner can finalize PO** (UPDATE, {public})
  - USING: `(is_pm_role(auth.uid()) AND user_in_org(auth.uid(), pricing_owner_org_id) AND (status = 'PRICED'::po_status))`
  - WITH CHECK: `(is_pm_role(auth.uid()) AND user_in_org(auth.uid(), pricing_owner_org_id) AND (status = ANY (ARRAY['PRICED'::po_status, 'FINALIZED'::po_status])))`
- **Project team and suppliers can view POs** (SELECT, {public})
  - USING: `(user_in_org(auth.uid(), organization_id) OR (EXISTS ( SELECT 1`
  - WITH CHECK: ``

###    FROM suppliers s

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((s.id = purchase_orders.supplier_id) AND user_in_org(auth.uid(), s.organization_id)))) OR ((project_id IS NOT NULL) AND (EXISTS ( SELECT 1

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = purchase_orders.project_id) AND (pt.org_id = get_user_org_id(auth.uid())) AND (pt.status = 'Accepted'::text))))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### purchase_orders

- **Supplier can mark PO as delivered** (UPDATE, {public})
  - USING: `(is_supplier_for_purchase_order(id) AND (status = 'ORDERED'::po_status))`
  - WITH CHECK: `(is_supplier_for_purchase_order(id) AND (status = 'DELIVERED'::po_status))`
- **Supplier can schedule delivery** (UPDATE, {public})
  - USING: `(is_supplier_for_purchase_order(id) AND (status = ANY (ARRAY['ORDERED'::po_status, 'READY_FOR_DELIVERY'::po_status])))`
  - WITH CHECK: `(is_supplier_for_purchase_order(id) AND (status = ANY (ARRAY['ORDERED'::po_status, 'READY_FOR_DELIVERY'::po_status, 'DELIVERED'::po_status])))`
- **Supplier can update priced POs** (UPDATE, {public})
  - USING: `(is_supplier_for_purchase_order(id) AND (status = 'PRICED'::po_status))`
  - WITH CHECK: `(is_supplier_for_purchase_order(id) AND (status = ANY (ARRAY['PRICED'::po_status, 'ORDERED'::po_status])))`
- **Supplier can update submitted POs** (UPDATE, {public})
  - USING: `(is_supplier_for_purchase_order(id) AND (status = 'SUBMITTED'::po_status))`
  - WITH CHECK: `(is_supplier_for_purchase_order(id) AND (status = ANY (ARRAY['SUBMITTED'::po_status, 'PRICED'::po_status, 'ORDERED'::po_status])))`

### reminders

- **Users can create own reminders** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `(auth.uid() = user_id)`
- **Users can delete own reminders** (DELETE, {public})
  - USING: `(auth.uid() = user_id)`
  - WITH CHECK: `-`
- **Users can update own reminders** (UPDATE, {public})
  - USING: `(auth.uid() = user_id)`
  - WITH CHECK: `-`
- **Users can view own reminders** (SELECT, {public})
  - USING: `(auth.uid() = user_id)`
  - WITH CHECK: `-`

### returns

- **Authorized orgs can update returns** (UPDATE, {public})
  - USING: `((user_in_org(auth.uid(), created_by_org_id) AND (status = ANY (ARRAY['DRAFT'::text, 'APPROVED'::text, 'SCHEDULED'::text, 'PRICED'::text]))) OR (user_in_org(auth.uid(), supplier_org_id) AND (status = ANY (ARRAY['SUBMITTED'::text, 'SUPPLIER_REVIEW'::text, 'PICKED_UP'::text, 'SCHEDULED'::text]))))`
  - WITH CHECK: `((user_in_org(auth.uid(), created_by_org_id) AND (status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text, 'SCHEDULED'::text, 'CLOSED'::text]))) OR (user_in_org(auth.uid(), supplier_org_id) AND (status = ANY (ARRAY['SUPPLIER_REVIEW'::text, 'APPROVED'::text, 'PICKED_UP'::text, 'PRICED'::text]))))`
- **Creator can delete draft returns** (DELETE, {authenticated})
  - USING: `(user_in_org(auth.uid(), created_by_org_id) AND (status = 'DRAFT'::text))`
  - WITH CHECK: `-`
- **GC/TC can create returns** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `((created_by_user_id = auth.uid()) AND user_in_org(auth.uid(), created_by_org_id) AND (EXISTS ( SELECT 1`

###    FROM project_team pt

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE ((pt.project_id = returns.project_id) AND (pt.org_id = returns.created_by_org_id) AND (pt.status = 'Accepted'::text) AND (pt.role = ANY (ARRAY['General Contractor'::text, 'Trade Contractor'::text]))))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### returns

- **Users can view returns for their orgs** (SELECT, {authenticated})
  - USING: `(user_in_org(auth.uid(), created_by_org_id) OR user_in_org(auth.uid(), supplier_org_id) OR ((pricing_owner_org_id IS NOT NULL) AND user_in_org(auth.uid(), pricing_owner_org_id)))`
  - WITH CHECK: `-`

### rfis

- **Project participants can create rfis** (INSERT, {public})
  - USING: `-`
  - WITH CHECK: `is_project_participant(auth.uid(), project_id)`
- **Project participants can view rfis** (SELECT, {public})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`
- **Submitter or recipient org can update rfis** (UPDATE, {public})
  - USING: `is_project_participant(auth.uid(), project_id)`
  - WITH CHECK: `-`

### supplier_estimates

- **Platform users can view all supplier estimates** (SELECT, {public})
  - USING: `is_platform_user(auth.uid())`
  - WITH CHECK: `-`
- **Project team can update estimates** (UPDATE, {public})
  - USING: `(project_id IN ( SELECT project_participants.project_id`
  - WITH CHECK: ``

###    FROM project_participants

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (project_participants.organization_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid())))))

- **(project_id IN ( SELECT project_participants.project_id** (, )
  - USING: ``
  - WITH CHECK: ``

###    FROM project_participants

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (project_participants.organization_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid())))))

- **** (, )
  - USING: ``
  - WITH CHECK: ``

### supplier_estimates

- **Project team can view estimates** (SELECT, {public})
  - USING: `(project_id IN ( SELECT project_participants.project_id`
  - WITH CHECK: ``

###    FROM project_participants

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (project_participants.organization_id IN ( SELECT user_org_roles.organization_id

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###            FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###           WHERE (user_org_roles.user_id = auth.uid())))))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

### supplier_estimates

- **Suppliers manage own estimates** (ALL, {public})
  - USING: `(supplier_org_id IN ( SELECT user_org_roles.organization_id`
  - WITH CHECK: ``

###    FROM user_org_roles

- **** (, )
  - USING: ``
  - WITH CHECK: ``

###   WHERE (user_org_roles.user_id = auth.uid())))

- **-** (, )
  - USING: ``
  - WITH CHECK: ``

## D. Cost / price / markup / margin columns (Phase 2 FC redaction targets)


### actual_cost_entries

- `cost_type` (text)
- `hourly_rate` (numeric)

### change_orders

- `tax_rate_snapshot` (numeric)
- `tc_snapshot_hourly_rate` (numeric)
- `tc_snapshot_markup_percent` (numeric)
- `tc_submitted_price` (numeric)

### change_orders_role_view

- `tax_rate_snapshot` (numeric)
- `tc_snapshot_hourly_rate` (numeric)
- `tc_snapshot_markup_percent` (numeric)
- `tc_submitted_price` (numeric)

### co_equipment_items

- `cost` (numeric)
- `markup_amount` (numeric)
- `markup_percent` (numeric)

### co_equipment_items_role_view

- `cost` (numeric)
- `markup_amount` (numeric)
- `markup_percent` (numeric)

### co_labor_entries

- `actual_cost_note` (text)
- `base_hourly_rate` (numeric)
- `hourly_rate` (numeric)
- `is_actual_cost` (boolean)
- `markup_percent` (numeric)

### co_labor_entries_role_view

- `actual_cost_note` (text)
- `base_hourly_rate` (numeric)
- `hourly_rate` (numeric)
- `is_actual_cost` (boolean)
- `markup_percent` (numeric)

### co_material_items

- `line_cost` (numeric)
- `markup_amount` (numeric)
- `markup_percent` (numeric)
- `unit_cost` (numeric)

### co_material_items_role_view

- `line_cost` (numeric)
- `markup_amount` (numeric)
- `markup_percent` (numeric)
- `unit_cost` (numeric)

### contract_sow_items

- `unit_cost` (numeric)

### org_settings

- `default_hourly_rate` (numeric)
- `labor_markup_percent` (numeric)

### organizations

- `default_equipment_markup_pct` (numeric)
- `default_materials_markup_pct` (numeric)

### po_line_items

- `original_unit_price` (numeric)
- `price_adjusted_by_supplier` (boolean)
- `price_source` (text)
- `unit_price` (numeric)

### profiles

- `hourly_rate` (numeric)

### project_contracts

- `material_markup_type` (text)
- `material_markup_value` (numeric)

### project_team

- `labor_rate` (numeric)

### projects

- `sales_tax_rate` (numeric)
- `tc_markup_visibility` (text)

### purchase_orders

- `priced_at` (timestamp with time zone)
- `priced_by` (uuid)

### return_items

- `credit_unit_price` (numeric)
- `original_unit_price` (numeric)

### subscription_plans

- `annual_price` (numeric)
- `monthly_price` (numeric)

### supplier_estimate_items

- `unit_price` (numeric)

### supplier_quotes

- `tc_markup_percent` (numeric)
- `unit_cost` (numeric)

### supplier_quotes_public

- `unit_cost` (numeric)

### tm_billable_slices

- `markup_amount` (numeric)

## E. Updated function definitions


```sql
CREATE OR REPLACE FUNCTION public.create_organization_and_set_admin(_org_name text, _org_type org_type, _org_phone text DEFAULT NULL::text, _address jsonb DEFAULT NULL::jsonb, _user_first_name text DEFAULT NULL::text, _user_last_name text DEFAULT NULL::text, _user_phone text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _org_id uuid;
  _org_code text;
  _role app_role;
  _existing_org_id uuid;
  _addr_street text;
  _addr_city text;
  _addr_state text;
  _addr_zip text;
  _user_email text;
  _scope text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  SELECT email INTO _user_email FROM profiles WHERE user_id = _user_id;
  IF _user_email IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  _addr_street := COALESCE(_address->>'street', '');
  _addr_city := COALESCE(_address->>'city', '');
  _addr_state := COALESCE(_address->>'state', '');
  _addr_zip := COALESCE(_address->>'zip', '');

  SELECT id INTO _existing_org_id
  FROM organizations
  WHERE 
    lower(trim(name)) = lower(trim(_org_name))
    AND lower(trim(COALESCE(address->>'street', ''))) = lower(trim(_addr_street))
    AND lower(trim(COALESCE(address->>'city', ''))) = lower(trim(_addr_city))
    AND lower(trim(COALESCE(address->>'state', ''))) = lower(trim(_addr_state))
    AND trim(COALESCE(address->>'zip', '')) = trim(_addr_zip)
    AND normalize_phone(phone) = normalize_phone(_org_phone)
  LIMIT 1;

  IF _existing_org_id IS NOT NULL THEN
    _org_id := _existing_org_id;
    SELECT org_code INTO _org_code FROM organizations WHERE id = _org_id;
  ELSE
    _org_code := upper(regexp_replace(substring(_org_name, 1, 10), '[^A-Za-z0-9]', '', 'g'));
    WHILE EXISTS (SELECT 1 FROM organizations WHERE org_code = _org_code) LOOP
      _org_code := _org_code || floor(random() * 1000)::text;
    END LOOP;

    INSERT INTO organizations (org_code, name, type, address, phone, created_by)
    VALUES (_org_code, _org_name, _org_type, _address, _org_phone, _user_id)
    RETURNING id INTO _org_id;
  END IF;

  CASE _org_type
    WHEN 'GC' THEN _role := 'GC_PM';
    WHEN 'TC' THEN _role := 'TC_PM';
    WHEN 'FC' THEN _role := 'FC_PM';
    WHEN 'SUPPLIER' THEN _role := 'SUPPLIER';
  END CASE;

  UPDATE profiles
  SET first_name = _user_first_name,
      last_name = _user_last_name,
      phone = _user_phone,
      full_name = _user_first_name || ' ' || _user_last_name,
      updated_at = now()
  WHERE user_id = _user_id;

  SELECT COALESCE(default_project_scope, 'org') INTO _scope
  FROM organizations WHERE id = _org_id;

  INSERT INTO user_org_roles (user_id, organization_id, role, project_scope)
  VALUES (_user_id, _org_id, _role, COALESCE(_scope, 'org'));

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'org_code', _org_code,
    'is_existing_org', _existing_org_id IS NOT NULL
  );
END;
$function$

```


```sql
CREATE OR REPLACE FUNCTION public.create_organization_and_set_admin(_org_type org_type, _org_name text, _address jsonb, _org_phone text, _user_first_name text, _user_last_name text, _user_phone text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _org_id uuid;
  _org_code text;
  _role app_role;
  _existing_org_id uuid;
  _addr_street text;
  _addr_city text;
  _addr_state text;
  _addr_zip text;
  _scope text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  _addr_street := COALESCE(_address->>'street', '');
  _addr_city := COALESCE(_address->>'city', '');
  _addr_state := COALESCE(_address->>'state', '');
  _addr_zip := COALESCE(_address->>'zip', '');

  SELECT id INTO _existing_org_id
  FROM organizations
  WHERE 
    lower(trim(name)) = lower(trim(_org_name))
    AND lower(trim(COALESCE(address->>'street', ''))) = lower(trim(_addr_street))
    AND lower(trim(COALESCE(address->>'city', ''))) = lower(trim(_addr_city))
    AND lower(trim(COALESCE(address->>'state', ''))) = lower(trim(_addr_state))
    AND trim(COALESCE(address->>'zip', '')) = trim(_addr_zip)
    AND normalize_phone(phone) = normalize_phone(_org_phone)
  LIMIT 1;

  IF _existing_org_id IS NOT NULL THEN
    _org_id := _existing_org_id;
    SELECT org_code INTO _org_code FROM organizations WHERE id = _org_id;
  ELSE
    _org_code := upper(regexp_replace(substring(_org_name, 1, 10), '[^A-Za-z0-9]', '', 'g'));
    WHILE EXISTS (SELECT 1 FROM organizations WHERE org_code = _org_code) LOOP
      _org_code := _org_code || floor(random() * 1000)::text;
    END LOOP;

    INSERT INTO organizations (org_code, name, type, address, phone, created_by)
    VALUES (_org_code, _org_name, _org_type, _address, _org_phone, _user_id)
    RETURNING id INTO _org_id;
  END IF;

  CASE _org_type
    WHEN 'GC' THEN _role := 'GC_PM';
    WHEN 'TC' THEN _role := 'TC_PM';
    WHEN 'FC' THEN _role := 'FC_PM';
    WHEN 'SUPPLIER' THEN _role := 'SUPPLIER';
  END CASE;

  INSERT INTO profiles (user_id, email, first_name, last_name, phone, full_name)
  SELECT _user_id, email, _user_first_name, _user_last_name, _user_phone, 
         _user_first_name || ' ' || _user_last_name
  FROM auth.users WHERE id = _user_id
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  SELECT COALESCE(default_project_scope, 'org') INTO _scope
  FROM organizations WHERE id = _org_id;

  INSERT INTO user_org_roles (user_id, organization_id, role, project_scope)
  VALUES (_user_id, _org_id, _role, COALESCE(_scope, 'org'));

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'org_code', _org_code,
    'is_existing_org', _existing_org_id IS NOT NULL
  );
END;
$function$

```


```sql
CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id UUID := auth.uid();
  _req org_join_requests;
  _org_type org_type;
  _role app_role;
  _scope TEXT;
BEGIN
  SELECT * INTO _req FROM org_join_requests WHERE id = _request_id AND status = 'pending';
  IF _req.id IS NULL THEN
    RAISE EXCEPTION 'Join request not found or already processed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_id = _caller_id
    AND organization_id = _req.organization_id
    AND role IN ('GC_PM', 'TC_PM', 'FC_PM')
  ) THEN
    RAISE EXCEPTION 'Not authorized to approve join requests';
  END IF;

  IF EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = _req.user_id) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  SELECT type, COALESCE(default_project_scope, 'org')
  INTO _org_type, _scope
  FROM organizations WHERE id = _req.organization_id;

  _role := CASE _org_type
    WHEN 'GC' THEN 'GC_PM'::app_role
    WHEN 'TC' THEN 'FS'::app_role
    WHEN 'FC' THEN 'FS'::app_role
    WHEN 'SUPPLIER' THEN 'SUPPLIER'::app_role
  END;

  INSERT INTO user_org_roles (user_id, organization_id, role, project_scope)
  VALUES (_req.user_id, _req.organization_id, _role, COALESCE(_scope, 'org'));

  IF _req.job_title IS NOT NULL THEN
    UPDATE profiles SET job_title = _req.job_title WHERE user_id = _req.user_id;
  END IF;

  UPDATE org_join_requests
  SET status = 'approved', reviewed_at = now(), reviewed_by = _caller_id
  WHERE id = _request_id;
END;
$function$

```


```sql
CREATE OR REPLACE FUNCTION public.accept_org_invitation(p_invitation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email TEXT;
  v_org_id UUID;
  v_role app_role;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_caller_email TEXT;
  v_scope TEXT;
BEGIN
  SELECT email INTO v_caller_email
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_caller_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email, organization_id, role, status, expires_at
  INTO v_email, v_org_id, v_role, v_status, v_expires_at
  FROM org_invitations
  WHERE id = p_invitation_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF lower(v_caller_email) <> lower(v_email) THEN
    RAISE EXCEPTION 'This invitation is not for your email address';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending';
  END IF;

  IF v_expires_at < now() THEN
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  SELECT COALESCE(default_project_scope, 'org') INTO v_scope
  FROM organizations WHERE id = v_org_id;

  INSERT INTO user_org_roles (user_id, organization_id, role, project_scope)
  VALUES (auth.uid(), v_org_id, v_role, COALESCE(v_scope, 'org'))
  ON CONFLICT DO NOTHING;

  UPDATE org_invitations
  SET status = 'accepted'
  WHERE id = p_invitation_id;
END;
$function$

```

