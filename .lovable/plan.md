

# Designated Supplier Satisfies "Supplier Assigned" Readiness

## Problem

The readiness engine in `useProjectReadiness.ts` checks for supplier assignment by looking at `project_participants` with role `'SUPPLIER'`. When a user designates a supplier contact via `project_designated_suppliers`, no participant record is created, so the checklist still shows "Supplier not yet assigned" and the project can't activate.

## Fix

Update `useProjectReadiness.ts` to also query `project_designated_suppliers` for the project. If a designated supplier exists with status `'active'`, treat it as equivalent to having a supplier assigned.

### File: `src/hooks/useProjectReadiness.ts`

1. Add a query for `project_designated_suppliers` in the parallel fetch (alongside projects, contracts, SOV, participants, estimates)
2. Update the `hasSupplier` logic:
   ```
   const hasDesignatedSupplier = designatedSupplierData && designatedSupplierData.status === 'active';
   const hasSupplier = supplierParticipants.length > 0 || hasDesignatedSupplier;
   ```
3. For the downstream checks when only a designated supplier exists (no real SUPPLIER participant):
   - **supplier_accepted**: Mark as complete (designated suppliers are directly assigned, no invite acceptance needed)
   - **supplier_estimate**: Skip this item entirely (designated suppliers use the system catalog, no estimate upload expected)

### Result

After designating a supplier contact, the readiness checklist will show "Supplier assigned" as complete. The supplier acceptance and estimate steps are only required when a real supplier organization is on the team.

