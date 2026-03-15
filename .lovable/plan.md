

# TCA: Tax Uniformity Implementation

## What's Working
- `sales_tax_percent` field added to `POWizardV2Data` and initialized to 0
- Tax auto-resolves from the most recent approved estimate when supplier is selected (new PO flow)
- ReviewScreen shows editable tax percentage with warning when 0%
- PO creation correctly uses `data.sales_tax_percent` from wizard
- PO edit/update correctly uses `data.sales_tax_percent` from wizard
- Tax calculation (subtotal × rate, grand total) displays correctly in ReviewScreen

## Bug Found
**`PurchaseOrdersTab.tsx` line 453**: When loading an existing PO for editing, `editInitialData` does NOT include `sales_tax_percent`. This means when editing a PO, the tax rate defaults to 0 instead of loading the PO's saved tax rate.

### Fix
In `PurchaseOrdersTab.tsx`, add `sales_tax_percent: po.sales_tax_percent ?? 0` to the `setEditInitialData` call (around line 453).

## Files to Modify
| File | Change |
|---|---|
| `src/components/project/PurchaseOrdersTab.tsx` | Add `sales_tax_percent` to `editInitialData` |

