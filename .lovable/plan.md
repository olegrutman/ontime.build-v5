

# Auto-Populate Material Estimate from Supplier Estimates

## Problem
Currently, the GC is asked to manually enter a "Supplier Estimate Price" in the new project wizard. Instead, the material estimate should be automatically calculated from approved supplier estimates. When a supplier submits an estimate with pricing and it gets approved, that total should feed into the `material_estimate_total` for whoever is responsible for materials.

## Changes

### 1. Remove "Estimate Price" input for Supplier contracts in the wizard
**File: `src/components/project-wizard-new/ContractsStep.tsx`**

When a team member is a Supplier, hide the entire `ContractCard` (or at minimum hide the "Estimate Price" / contract sum input). Suppliers should not have a manually entered estimate price at project creation -- it will come from actual supplier estimates later.

- In the `downstreamMembers` filtering logic, exclude Supplier members from getting contract cards entirely
- Or: keep the card but remove the "Estimate Price" field for suppliers (simpler, keeps retainage and notes)

The cleanest approach: filter out Supplier role members from the contracts step since there is no meaningful contract data to enter for them at project creation time.

### 2. Auto-update `material_estimate_total` when a supplier estimate is approved
**File: `src/pages/EstimateApprovals.tsx`**

After the `handleApprove` function successfully approves an estimate:
1. Query all approved `supplier_estimates` for that project to get the sum of `total_amount`
2. Find the `project_contracts` row that has `material_responsibility` set (either GC or TC contract)
3. Update `material_estimate_total` on that contract with the aggregated sum

```text
Approve estimate
  --> Query: SELECT SUM(total_amount) FROM supplier_estimates 
             WHERE project_id = X AND status = 'APPROVED'
  --> Query: SELECT id FROM project_contracts 
             WHERE project_id = X AND material_responsibility IS NOT NULL
  --> Update: SET material_estimate_total = sum
```

### 3. Also update when supplier submits estimate with pricing
**File: `src/pages/SupplierProjectEstimates.tsx`**

When a supplier submits an estimate (status changes to SUBMITTED), or when items are imported/updated and the `total_amount` is recalculated -- no action needed at submit time since the auto-update happens at approval. But if the supplier updates items on an already-approved estimate, the total should be recalculated. For now, the approval path is the primary trigger.

### 4. Update `useProjectFinancials` to always read from `material_estimate_total`
**File: `src/hooks/useProjectFinancials.ts`**

Currently, `material_estimate_total` is only used when the viewer is a TC with material responsibility. Update the logic so that regardless of who is material-responsible (GC or TC), the `materialEstimate` value comes from `material_estimate_total` on the relevant contract if it exists. Fall back to work-order-derived totals only if no value is set.

## Technical Details

### Files Modified
- **`src/components/project-wizard-new/ContractsStep.tsx`** -- Remove supplier contract cards from the wizard (no manual estimate price entry)
- **`src/pages/EstimateApprovals.tsx`** -- After approving an estimate, aggregate all approved estimate totals and write to the material-responsible contract's `material_estimate_total`
- **`src/hooks/useProjectFinancials.ts`** -- Read `material_estimate_total` for both GC and TC material-responsible contracts, not just TC

### No Database Changes Required
The `material_estimate_total` column already exists on `project_contracts`. No new tables or columns needed.

### Flow

```text
Supplier creates estimate with line items (pricing included)
  --> Supplier submits estimate
  --> GC/PM approves estimate on /approvals/estimates
  --> System auto-sums all approved estimates for that project
  --> Writes sum to project_contracts.material_estimate_total
  --> Material Budget card on project page auto-reflects the new total
  --> "Material Ordered vs Est." compares PO spend against this total
```
