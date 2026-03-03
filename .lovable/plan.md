
# Role-Based Financial Overview with Manual Material Markup

## Summary
Restructure the Project Overview financial cluster into clearly separated blocks per role (GC, TC, FC), add a GC manual "Owner Contract" profit calculation, add project-level TC material markup fields, and add a Work Order summary card. Each role sees: Contract Position, Invoice Health, Profit Position, Work Order Position, and Materials Position (if responsible).

## Database Migration

Add two columns to `project_contracts` for project-level TC material markup:

```sql
ALTER TABLE project_contracts
  ADD COLUMN material_markup_type TEXT DEFAULT NULL,
  ADD COLUMN material_markup_value NUMERIC DEFAULT NULL;
```

Also add a column for GC's owner contract value:

```sql
ALTER TABLE project_contracts
  ADD COLUMN owner_contract_value NUMERIC DEFAULT NULL;
```

These go on the primary GC-TC contract record. No new tables needed.

## Hook Changes: `useProjectFinancials.ts`

### New fields to add to `ProjectFinancials` interface:
- `ownerContractValue: number | null` -- GC manual entry
- `materialMarkupType: string | null` -- TC project markup type ('percent' | 'fixed')
- `materialMarkupValue: number | null` -- TC project markup value
- `woLaborTotal: number` -- sum of labor_total from approved/contracted WOs
- `woMaterialTotal: number` -- sum of material_total from approved/contracted WOs
- `woEquipmentTotal: number` -- derived (total - labor - material)
- `fcContractValue: number` -- FC contract sum (already available as downstreamContract.contract_sum)
- `invoicesSent: { total: number; paid: number; retainage: number; outstanding: number }` -- invoices where user org is sender
- `invoicesReceived: { total: number; paid: number; retainage: number; outstanding: number }` -- invoices where user org is receiver

### New actions:
- `updateOwnerContract(contractId: string, value: number): Promise<boolean>` -- saves owner_contract_value
- `updateMaterialMarkup(contractId: string, type: string, value: number): Promise<boolean>` -- saves markup

### Fetch changes:
- Read `owner_contract_value`, `material_markup_type`, `material_markup_value` from the primary contract select
- Compute WO labor/material totals from existing approved WOs
- For TC: split invoices into sent (to GC) vs received (from supplier/FC) by checking org direction on contracts

## New Components

### 1. `ProfitCard.tsx`
Role-aware profit display:

**GC:** Shows Owner Contract Value (editable), minus Current Contract Total = GC Profit. Hidden if owner contract not set.

**FC:** Shows Current Contract Total minus Labor Budget = FC Profit. Hidden if labor budget not set.

**TC (not material responsible):**
- Labor Margin = Revenue Total - FC Labor Cost
- Labor Margin %

**TC (material responsible):**
- Labor Margin = Revenue Labor Portion - FC Labor Cost
- Material Cost = Delivered PO Net Total
- Material Revenue = Material Cost x (1 + markup%) OR Material Cost + fixed markup
- Material Margin = Material Revenue - Material Cost
- Total Projected Profit = Labor Margin + Material Margin

### 2. `WorkOrderSummaryCard.tsx` (new, distinct from existing WorkOrderSummaryCard)
Rename existing to avoid conflict or enhance existing. Shows:

**GC:** WO Labor Total, WO Materials Total, WO Grand Total

**FC:** Hours Entered, Rate, Earned to Date, Budget vs Actual

**TC (not material responsible):**
- WO Labor Revenue (from GC), WO Labor Cost (to FC), WO Labor Margin

**TC (material responsible):**
- WO Labor Revenue/Cost/Margin
- WO Material Revenue/Cost/Margin (separate from PO materials)

### 3. `MaterialMarkupEditor.tsx`
Small inline editor (same pattern as labor budget editor) for TC to set:
- Markup Type toggle: Percentage / Fixed Amount
- Markup Value input
- Only editable when project status is 'setup' or 'draft'; after 'active' requires confirmation dialog

## Layout Changes: `ProjectHome.tsx`

Replace the current financial cluster with structured blocks:

```text
[ContractHeroCard -- same as now, role-aware]
[Grid 2-col:]
  [BillingCashCard (Invoice Health)]  |  [ProfitCard]
[Grid 2-col:]
  [WorkOrderSummaryCard]  |  [BudgetTracking (Labor, GC/FC only)]
[MaterialsBudgetStatusCard -- if responsible, full width]
[MaterialMarkupEditor -- TC only, if material responsible, inline]
[CollapsibleOperations]
```

FC layout:
```text
[ContractHeroCard (FC version)]
[Grid 2-col:]
  [BillingCashCard]  |  [ProfitCard (FC)]
[WorkOrderSummaryCard (FC)]
[BudgetTracking (Labor)]
[CollapsibleOperations]
```

## Existing Component Updates

### ContractHeroCard
- No structural changes. Already role-aware for GC/TC/FC/Supplier.

### BillingCashCard
- Already shows Total Invoiced, Paid, Retainage, Outstanding.
- For TC: ideally split into "Invoices to GC" and "Invoices from Supplier" but this can remain combined initially to avoid complexity. Label stays "Billing & Cash Position".
- For FC: label adjusts to show invoice direction. Keep existing implementation.

### BudgetTracking
- Already shows labor only for GC/FC. No changes needed.

## Technical Details

### Files Created
| File | Purpose |
|------|---------|
| `src/components/project/ProfitCard.tsx` | Role-aware profit calculation display |
| `src/components/project/WorkOrderFinancialsCard.tsx` | WO-level financial summary per role |
| `src/components/project/MaterialMarkupEditor.tsx` | TC project-level material markup input |

### Files Modified
| File | Change |
|------|---------|
| `src/hooks/useProjectFinancials.ts` | Add new fields, fetch new contract columns, compute WO breakdowns |
| `src/pages/ProjectHome.tsx` | Restructure overview layout with new cards |
| `src/components/project/index.ts` | Export new components |

### Database: 1 migration
- Add `material_markup_type`, `material_markup_value`, `owner_contract_value` to `project_contracts`

### Profit Formulas

**GC Profit:**
```
Owner Contract Value - Current Contract Total
(Current Contract Total = Original Contract + Approved WOs)
```

**FC Profit:**
```
Current Contract Total - Labor Budget
```

**TC Profit (no materials):**
```
Labor Margin = (GC Contract + Approved WOs) - FC Contract Total
```

**TC Profit (with materials):**
```
Labor Margin = Revenue Total - FC Labor Cost
Material Cost = Delivered PO Net Total (excludes WO materials)
Material Revenue = 
  if markup type = percent: Material Cost * (1 + markup%)
  if markup type = fixed: Material Cost + markup value
Material Margin = Material Revenue - Material Cost
Total Profit = Labor Margin + Material Margin
```

### Key Rule Enforcement
- WO materials are shown ONLY in the WorkOrderFinancialsCard
- PO materials tracking (MaterialsBudgetStatusCard) excludes WO materials
- Profit calculations use delivered PO net (not WO material totals) for material margin
