
# Include Tax in PO Totals on Overview Cards

## Problem
The Supplier Financial Summary and Estimates vs Orders cards on the project overview page show PO totals as subtotals only (sum of line items), without applying `sales_tax_percent`.

## Changes

### 1. `src/components/project/SupplierFinancialsSummaryCard.tsx` (line 49)
Update the PO query to also select `sales_tax_percent`:
```
.select('id, sales_tax_percent, po_line_items(line_total)')
```
Then update the `totalContract` calculation (lines 56-59) to apply tax per PO:
```typescript
const totalContract = pos?.reduce((sum, po) => {
  const subtotal = po.po_line_items?.reduce((s, li) => s + (li.line_total || 0), 0) || 0;
  const taxRate = (po.sales_tax_percent || 0) / 100;
  return sum + subtotal * (1 + taxRate);
}, 0) || 0;
```

### 2. `src/components/project/SupplierEstimateVsOrdersCard.tsx` (line 60)
Update the PO query to also select `sales_tax_percent`:
```
.select('sales_tax_percent, po_line_items(line_total)')
```
Then update the `totalOrders` calculation (lines 67-69) to apply tax per PO:
```typescript
const totalOrders = pos?.reduce((sum, po) => {
  const subtotal = po.po_line_items?.reduce((s: number, li: any) => s + (li.line_total || 0), 0) || 0;
  const taxRate = (po.sales_tax_percent || 0) / 100;
  return sum + subtotal * (1 + taxRate);
}, 0) || 0;
```

No UI template changes needed -- just the data calculations.
