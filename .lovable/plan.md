

# Add Sales Tax to Purchase Orders

## Overview

Allow suppliers to add a sales tax percentage to POs during pricing, with automatic calculation of the total including tax.

---

## Part 1: Database Schema Changes

### 1.1 Add `sales_tax_percent` to `purchase_orders`

Store the tax percentage at the PO level (not per line item, since tax typically applies to the whole order).

```sql
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS sales_tax_percent numeric(5,3) DEFAULT 0;
```

**Notes:**
- `numeric(5,3)` allows values like `8.250` (max 99.999%)
- Default of 0 means no tax by default
- Stored at PO level since most jurisdictions apply a single tax rate to the whole order

---

## Part 2: Type Updates

### 2.1 Update `src/types/purchaseOrder.ts`

Add the new field to the PurchaseOrder interface:

```typescript
export interface PurchaseOrder {
  // ... existing fields
  sales_tax_percent?: number | null;
}
```

---

## Part 3: Frontend - PODetail.tsx Updates

### 3.1 Add State for Tax Percentage

When supplier is editing prices, also allow editing the tax percentage:

```typescript
const [salesTaxPercent, setSalesTaxPercent] = useState<number>(0);
```

Initialize from PO data when entering edit mode:

```typescript
const initializePriceEdits = () => {
  // ... existing code
  setSalesTaxPercent(po?.sales_tax_percent ?? 0);
  setEditingPrices(true);
};
```

### 3.2 Add Tax Input Field

Show a tax percentage input in the table footer when editing:

```typescript
{editingPrices && (
  <TableRow>
    <TableCell colSpan={5} className="text-right">
      Sales Tax
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step="0.001"
          min="0"
          max="100"
          className="w-20 text-right"
          value={salesTaxPercent}
          onChange={(e) => setSalesTaxPercent(parseFloat(e.target.value) || 0)}
        />
        <span>%</span>
      </div>
    </TableCell>
    <TableCell className="text-right">
      {formatCurrency(subtotal * (salesTaxPercent / 100))}
    </TableCell>
  </TableRow>
)}
```

### 3.3 Update Table Footer Display

Show subtotal, tax, and grand total:

```typescript
// When viewing (not editing)
{showPricingColumns && !editingPrices && po.sales_tax_percent > 0 && (
  <>
    <TableRow>
      <TableCell colSpan={5} className="text-right">Subtotal</TableCell>
      <TableCell></TableCell>
      <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
    </TableRow>
    <TableRow>
      <TableCell colSpan={5} className="text-right">
        Sales Tax ({po.sales_tax_percent}%)
      </TableCell>
      <TableCell></TableCell>
      <TableCell className="text-right">
        {formatCurrency(subtotal * (po.sales_tax_percent / 100))}
      </TableCell>
    </TableRow>
    <TableRow className="bg-muted/50">
      <TableCell colSpan={5} className="text-right font-bold">Total</TableCell>
      <TableCell></TableCell>
      <TableCell className="text-right font-bold text-lg">
        {formatCurrency(subtotal * (1 + po.sales_tax_percent / 100))}
      </TableCell>
    </TableRow>
  </>
)}
```

### 3.4 Update handleSavePrices

Save the tax percentage when supplier saves pricing:

```typescript
const handleSavePrices = async () => {
  // ... existing line item updates

  // Update PO status and tax
  await supabase
    .from('purchase_orders')
    .update({
      status: 'PRICED',
      sales_tax_percent: salesTaxPercent,
      priced_at: new Date().toISOString(),
      priced_by: user.id,
    })
    .eq('id', poId);
};
```

---

## Part 4: Visual Design

### Footer Layout (When Viewing Priced PO)

| Description | Unit Price | Total |
|-------------|-----------|-------|
| ... items ... | | |
| **Subtotal** | | $1,234.56 |
| Sales Tax (8.25%) | | $101.85 |
| **Grand Total** | | **$1,336.41** |

### Footer Layout (When Editing Prices)

| Description | Unit Price | Total | Lead Time |
|-------------|-----------|-------|-----------|
| ... items with inputs ... | | | |
| **Subtotal** | | $1,234.56 | |
| Sales Tax | [8.25] % | $101.85 | |
| **Grand Total** | | **$1,336.41** | |

---

## Implementation Steps

```text
1. Database Migration
   └── Add sales_tax_percent column to purchase_orders

2. Type Updates
   └── Add sales_tax_percent to PurchaseOrder interface

3. PODetail.tsx Updates
   ├── Add salesTaxPercent state
   ├── Initialize from PO data when editing
   ├── Add tax input row in edit mode
   ├── Show subtotal/tax/total breakdown when viewing
   └── Save tax with handleSavePrices
```

---

## Security Considerations

- Only suppliers can edit tax (when PO status is SUBMITTED)
- Tax percentage is visible to pricing owner and supplier (follows same visibility rules)
- No special RLS needed - uses existing PO update policies

---

## Summary

| Feature | Implementation |
|---------|----------------|
| Storage | `sales_tax_percent` on `purchase_orders` table |
| Input | Number input (0-100%) shown when supplier adds pricing |
| Display | Subtotal → Tax → Total breakdown in footer |
| Permissions | Same as unit price visibility/editability |

