
# Plan: Add PO Cost vs. Marked-Up Price Tracking

## Summary

Add a new **Material Cost Summary** card to the Financial Snapshot section that shows:
- Base supplier cost (from POs)
- Markup amount/percentage
- Marked-up total (revenue from materials)
- Material profit margin

This gives Trade Contractors visibility into their material profitability across all project work orders.

---

## Current Data Flow

```text
Supplier prices PO → TC adds markup → Marked-up total billed to GC
         ↓                  ↓                    ↓
   po_line_items     change_order_projects    material_total
     .line_total     .material_markup_*        (stored)
```

The system already stores:
- `po_line_items.line_total` - supplier costs
- `change_order_projects.material_markup_type/percent/amount` - markup settings
- `change_order_projects.material_total` - marked-up amount

---

## New Card: Material Cost Summary

### Location
Add to `ProjectFinancialsSectionNew.tsx` in the Financial Snapshot grid (TC view only).

### Visual Design

```text
┌────────────────────────────────────────┐
│ 📦 Material Costs                      │
├────────────────────────────────────────┤
│ Supplier Costs        $8,450           │
│ Markup Applied       +$1,267  (15%)    │
│ ────────────────────────────────────── │
│ Revenue from GC       $9,717           │
│                                        │
│ Material Profit        $1,267          │
│ Margin                 13.0%           │
└────────────────────────────────────────┘
```

### Data Requirements

Query all work orders (`change_order_projects`) with linked POs for this project:

```sql
SELECT 
  cop.id,
  cop.linked_po_id,
  cop.material_markup_type,
  cop.material_markup_percent,
  cop.material_markup_amount,
  cop.material_total
FROM change_order_projects cop
WHERE cop.project_id = :projectId
  AND cop.linked_po_id IS NOT NULL
```

For each linked PO, sum the `po_line_items.line_total` to get base cost.

---

## Technical Changes

### File: `src/components/project/ProjectFinancialsSectionNew.tsx`

**Add New State Variables:**
```typescript
const [materialCosts, setMaterialCosts] = useState<{
  supplierCost: number;
  markupAmount: number;
  revenueTotal: number;
  avgMarkupPercent: number;
}>({ supplierCost: 0, markupAmount: 0, revenueTotal: 0, avgMarkupPercent: 0 });
```

**Add Fetch Logic in `fetchData()`:**
```typescript
// Fetch work orders with linked POs for material cost tracking
const { data: workOrdersWithPO } = await supabase
  .from('change_order_projects')
  .select('id, linked_po_id, material_markup_type, material_markup_percent, material_markup_amount, material_total')
  .eq('project_id', projectId)
  .not('linked_po_id', 'is', null);

if (workOrdersWithPO && workOrdersWithPO.length > 0) {
  const poIds = workOrdersWithPO.map(wo => wo.linked_po_id).filter(Boolean);
  
  // Fetch PO line item totals
  const { data: poItems } = await supabase
    .from('po_line_items')
    .select('po_id, line_total')
    .in('po_id', poIds);
  
  // Sum by PO
  const poSubtotals = new Map<string, number>();
  (poItems || []).forEach(item => {
    const current = poSubtotals.get(item.po_id) || 0;
    poSubtotals.set(item.po_id, current + (item.line_total || 0));
  });
  
  // Calculate totals
  let supplierCost = 0;
  let markupAmount = 0;
  let revenueTotal = 0;
  
  workOrdersWithPO.forEach(wo => {
    const baseCost = poSubtotals.get(wo.linked_po_id!) || 0;
    supplierCost += baseCost;
    
    const markup = wo.material_markup_type === 'percent'
      ? baseCost * ((wo.material_markup_percent || 0) / 100)
      : (wo.material_markup_amount || 0);
    
    markupAmount += markup;
    revenueTotal += baseCost + markup;
  });
  
  const avgMarkupPercent = supplierCost > 0 ? (markupAmount / supplierCost) * 100 : 0;
  
  setMaterialCosts({ supplierCost, markupAmount, revenueTotal, avgMarkupPercent });
}
```

**Add New Card (TC View only):**
```tsx
{/* Material Cost Summary - TC Only */}
{isTCView && materialCosts.supplierCost > 0 && (
  <Card className="border-l-4 border-l-teal-500">
    <CardContent className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/20">
          <Package className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <p className="text-sm font-medium">Material Costs</p>
          <p className="text-xs text-muted-foreground">From {workOrdersWithPOCount} work orders</p>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Supplier Costs</span>
          <span>{formatCurrency(materialCosts.supplierCost)}</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>Markup ({materialCosts.avgMarkupPercent.toFixed(1)}%)</span>
          <span>+{formatCurrency(materialCosts.markupAmount)}</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between font-semibold">
          <span>Material Revenue</span>
          <span>{formatCurrency(materialCosts.revenueTotal)}</span>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

---

## Also Update: POSummaryCard

Enhance the existing `POSummaryCard` to show cost breakdown for TC view.

### File: `src/components/project/POSummaryCard.tsx`

**Add to Totals Interface:**
```typescript
interface POTotals {
  // ... existing
  baseCost: number;      // Supplier pricing
  markupTotal: number;   // Markup from work orders
}
```

**Fetch Linked Work Orders:**
For POs linked to work orders, calculate the markup applied.

**Display for TC:**
```tsx
{isTCView && canViewPricing && (
  <div className="pt-3 border-t space-y-1">
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Supplier Cost</span>
      <span>{formatCurrency(totals.baseCost)}</span>
    </div>
    <div className="flex justify-between text-sm text-green-600">
      <span>Markup</span>
      <span>+{formatCurrency(totals.markupTotal)}</span>
    </div>
    <div className="flex justify-between font-medium pt-1 border-t">
      <span>Total Revenue</span>
      <span>{formatCurrency(totals.totalSpend + totals.markupTotal)}</span>
    </div>
  </div>
)}
```

---

## Role Visibility Summary

| Role | Sees in Material Costs Card |
|------|----------------------------|
| **TC** | Full breakdown: Supplier cost, Markup %, Markup $, Revenue, Profit margin |
| **GC** | Hidden (they only see the final material_total on work orders) |
| **FC** | Hidden (no financial visibility on materials) |
| **Supplier** | Hidden (they only see their own PO pricing) |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/project/ProjectFinancialsSectionNew.tsx` | Add Material Costs card with cost vs. markup breakdown (TC view) |
| `src/components/project/POSummaryCard.tsx` | Add cost vs. markup summary in footer (TC view) |

---

## Future Enhancement

Consider adding a "Material Profitability" detail page accessible from this card showing:
- Per-work-order material profit breakdown
- Historical markup trends
- Supplier cost comparison
