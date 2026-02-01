
# Plan: Clear All Test Data

## Overview
Delete all existing projects, work orders, invoices, and related data from the database to allow you to start fresh with testing.

## Current Data to be Deleted
| Table | Records |
|-------|---------|
| Projects | 1 |
| Work Orders | 3 |
| Invoices | 3 |
| SOV Items | 72 |
| Contracts | 9 |
| Team Members | 4 |
| Scope Details | 1 |

## Deletion Order (respecting foreign key constraints)

Due to foreign key relationships, data must be deleted in the correct order:

### Phase 1: Delete Work Order Related Data
1. `change_order_checklist` - work order checklists
2. `change_order_equipment` - equipment entries
3. `change_order_fc_hours` - field crew hours
4. `change_order_materials` - materials
5. `change_order_tc_labor` - TC labor entries
6. `change_order_participants` - work order participants
7. `change_order_projects` - the work orders themselves

### Phase 2: Delete Invoice Related Data
1. `invoice_line_items` - invoice line items
2. `invoices` - the invoices

### Phase 3: Delete Project Related Data
1. `project_activity` - activity logs
2. `project_contracts` - contracts
3. `project_scope_details` - scope configuration
4. `project_sov_items` - SOV line items
5. `project_sov` - SOV headers
6. `project_team` - team members
7. `project_participants` - project participants
8. `project_invites` - pending invites
9. `project_relationships` - project relationships
10. `projects` - the projects themselves

### Phase 4: Optional Cleanup
- `notifications` - clear notification history
- `project_activity` - clear activity logs

## Technical Implementation

A single database migration will execute `DELETE FROM` statements in the correct order:

```sql
-- Phase 1: Work Order data
DELETE FROM change_order_checklist;
DELETE FROM change_order_equipment;
DELETE FROM change_order_fc_hours;
DELETE FROM change_order_materials;
DELETE FROM change_order_tc_labor;
DELETE FROM change_order_participants;
DELETE FROM change_order_projects;

-- Phase 2: Invoice data
DELETE FROM invoice_line_items;
DELETE FROM invoices;

-- Phase 3: Project data
DELETE FROM project_activity;
DELETE FROM project_contracts;
DELETE FROM project_scope_details;
DELETE FROM project_sov_items;
DELETE FROM project_sov;
DELETE FROM project_team;
DELETE FROM project_participants;
DELETE FROM project_invites;
DELETE FROM project_relationships;
DELETE FROM projects;

-- Phase 4: Cleanup
DELETE FROM notifications;
```

## What Will NOT Be Deleted
- **Organizations** - your company/team structure
- **User profiles** - your account and team member accounts
- **Suppliers** - supplier directory
- **Catalog items** - product catalog
- **Trades** - trade definitions
- **Trusted partners** - partner relationships

## After Deletion
You'll have a clean slate to:
- Create new test projects
- Test the Work Order wizard
- Test invoicing flows
- etc.

## Note
After running this, you'll be redirected to the dashboard since the current project will no longer exist.
