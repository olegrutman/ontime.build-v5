

# Fix: GC Cannot See TC Labor Details (RLS Policy Missing)

## Problem
The TC labor hours and hourly rate are not showing on the GC's work order review because of a missing database security policy. The `change_order_tc_labor` table only has one policy ("TC can manage their labor") that restricts access to Trade Contractors. General Contractors have no read access, so the query returns empty results -- causing the expanded labor card to show "Line-item detail not available."

The data itself is correct in the database (e.g., 36 hours at $25/hr = $900), it's just invisible to the GC user.

## Fix

### Database Migration
Add a new RLS policy granting GC users SELECT (read-only) access to TC labor entries for work orders on their projects:

```sql
CREATE POLICY "GC can view TC labor"
  ON change_order_tc_labor
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM change_order_projects cop
      JOIN project_team pt ON pt.project_id = cop.project_id
      JOIN user_org_roles uor ON uor.organization_id = pt.org_id
      WHERE cop.id = change_order_tc_labor.change_order_id
        AND uor.user_id = auth.uid()
        AND pt.role = 'General Contractor'
        AND pt.status = 'Accepted'
    )
  );
```

### No Code Changes Needed
The frontend component (`GCLaborReviewPanel`) already handles displaying the hours, rate, and total columns correctly. Once the GC can read the data, it will render automatically.

## Result
After the policy is added, the GC will see the full labor breakdown (description, hours, hourly rate, total) when expanding the labor card on any work order.

