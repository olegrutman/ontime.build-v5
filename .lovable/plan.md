
# Fix Three Bugs: Team Redundancy, WO Total, Labor Budget RLS

## Bug 1: Remove Team section from OperationalSummary

**File**: `src/components/project/OperationalSummary.tsx`

Remove the entire Team card block (lines 271-317) including:
- The team state, fetchTeam, teamByRole logic
- The AddTeamMemberDialog and DesignateSupplierDialog components and their imports
- The designated supplier state and fetch
- Keep: Work Orders, Invoices, RFIs, and Scope sections

Also remove unused imports: `Users`, `UserPlus`, `Plus` (if only used for team), `useAuth` (if only used for team), `AddTeamMemberDialog`, `DesignateSupplierDialog`, `Badge`.

## Bug 2: Work Order total missing linked PO materials

**Problem**: `useProjectFinancials` line 255 sums `wo.final_price` directly, but `final_price` does not include linked PO material costs. The `enrichWorkOrderTotals` utility in `src/lib/computeWorkOrderTotal.ts` exists for exactly this purpose but is never called.

**Fix in `src/hooks/useProjectFinancials.ts`**:
- Import `enrichWorkOrderTotals` from `@/lib/computeWorkOrderTotal`
- After fetching work orders (line 253), call `enrichWorkOrderTotals(approvedWOs)` to get the real totals map
- Sum the enriched totals instead of `wo.final_price`
- This correctly adds linked PO line item subtotals + markup to the work order totals

The enriched total for "Rfi 87" will be: labor($5,500) + PO materials($14,884) + equipment($670) = $21,054 instead of $6,170.

## Bug 3: Labor budget RLS policy prevents non-creator updates

**Problem**: The RLS UPDATE policy on `project_contracts` only allows `created_by_user_id = auth.uid()`. When a GC or TC who didn't create the primary contract tries to update `labor_budget` or `material_estimate_total`, the update silently affects 0 rows and the value is never persisted.

**Fix**: Database migration to update the RLS policy. Replace the restrictive creator-only policy with one that allows updates from any user who belongs to either the `from_org_id` or `to_org_id` organization on the contract:

```sql
DROP POLICY "Contract creators can update contracts" ON project_contracts;

CREATE POLICY "Contract party members can update contracts"
ON project_contracts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_org_roles.user_id = auth.uid()
    AND (
      user_org_roles.organization_id = project_contracts.from_org_id
      OR user_org_roles.organization_id = project_contracts.to_org_id
    )
  )
);
```

This allows any user belonging to either organization on the contract to update it -- matching the business logic where both GC and TC should be able to edit budgets and contract values.

Additionally, update `updateLaborBudget` and `updateContract` to check the returned row count or error, and show a proper error toast if the update fails instead of appearing to succeed.

## Files Modified

1. **`src/components/project/OperationalSummary.tsx`** -- Remove Team section and related state/imports
2. **`src/hooks/useProjectFinancials.ts`** -- Use `enrichWorkOrderTotals` for accurate WO totals
3. **Database migration** -- Fix RLS policy on `project_contracts` to allow party member updates
4. **`src/hooks/useProjectFinancials.ts`** -- Add error handling for silent update failures
