

# Material Estimate Tracking for TC (When Material-Responsible)

## The Problem
When a GC creates a project and assigns the TC as material-responsible, the TC currently has no way to record their expected material costs with suppliers. This means there's no "estimated vs actual" material cost tracking for TC-managed materials.

## How It Works Today
- **GC is material-responsible**: GC enters a Supplier "Estimate Price" during project creation (stored as `contract_sum` on a Supplier contract row in `project_contracts`)
- **TC is material-responsible**: The Supplier card is correctly hidden from the GC wizard, but the TC has nowhere to enter their material estimate later
- The financial signal bar already shows "Material Ordered vs Est." but the estimate value comes from work order data, not a project-level budget

## What Changes

### 1. Add a `material_estimate_total` column to `project_contracts`
A new nullable numeric column on the `project_contracts` table. This stores the TC's estimated material budget for a contract where `material_responsibility = 'TC'`. This is separate from `contract_sum` (which is the labor/service contract value between GC and TC).

### 2. New "Material Budget" card on the Project Overview (TC view)
When a TC views a project where they have `material_responsibility = 'TC'`, a new editable card appears in the overview. This card shows:
- **Estimated Material Cost** -- an inline-editable dollar amount the TC sets (their expected spend with suppliers)
- **Actual Material Ordered** -- the sum of finalized PO line items (already tracked)
- **Variance** -- green if under budget, red if over

The TC can click to edit and save their material estimate at any time. This value is stored in the `material_estimate_total` field on their contract row.

### 3. Update `useProjectFinancials` hook
When the viewer is a TC, read `material_estimate_total` from their upstream contract (GC-to-TC) and use it as the `materialEstimate` value instead of the work-order-derived total. This flows through to the existing "Material Ordered vs Est." card in the FinancialSignalBar without any changes needed there.

### 4. Update `FinancialSignalBar` for TC
Add a dedicated "Material Budget" signal card for TCs that shows the estimate and is editable (pencil icon to update the value). If no estimate is set yet, show a prompt to "Set material budget".

## Technical Details

### Database Migration
```sql
ALTER TABLE project_contracts 
ADD COLUMN material_estimate_total numeric DEFAULT NULL;
```

No new RLS policies needed -- TCs can already update their own contract rows via existing policies.

### Files Modified
- **`src/hooks/useProjectFinancials.ts`** -- Read `material_estimate_total` from the TC's contract; use it for `materialEstimate` when viewer is TC with material responsibility
- **`src/components/project/FinancialSignalBar.tsx`** -- Add editable "Material Budget" card for TC; allow inline editing that saves to `project_contracts.material_estimate_total`

### Files Created
None -- this reuses existing components and patterns (inline edit already exists in FinancialSignalBar for contract sums).

### Flow Summary

```text
GC creates project
  |-- Assigns TC as material-responsible
  |-- Supplier estimate card hidden from GC (already done)
  |
TC opens project page
  |-- Sees "Material Budget" card showing "Set budget"
  |-- Clicks pencil, enters estimated material cost (e.g., $50,000)
  |-- Saved to project_contracts.material_estimate_total
  |
TC creates POs with suppliers
  |-- "Material Ordered vs Est." card auto-updates
  |-- Shows $12,000 / $50,000 (green) or $55,000 / $50,000 (red)
```

This is a lightweight approach -- one new column, updates to two existing files, and it reuses the inline-edit pattern already built into the financial signal bar.
