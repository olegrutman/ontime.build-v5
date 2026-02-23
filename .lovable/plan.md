
# Show PO Total Including Tax on PO Card

## Change

In `src/components/purchase-orders/POCard.tsx`, update the total calculation (lines 91-93) to include the PO's `sales_tax_percent` when computing the displayed amount.

### Current logic (line 91-93):
```typescript
const total = canViewPricing && po.line_items 
  ? po.line_items.reduce((sum, item) => sum + (item.line_total || 0), 0)
  : null;
```

### New logic:
```typescript
const subtotal = canViewPricing && po.line_items 
  ? po.line_items.reduce((sum, item) => sum + (item.line_total || 0), 0)
  : null;
const taxRate = (po.sales_tax_percent || 0) / 100;
const total = subtotal !== null ? subtotal * (1 + taxRate) : null;
```

No other files need changes. The `PurchaseOrder` type already has `sales_tax_percent` and it's already fetched in the query.
