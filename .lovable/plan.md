

# Fix: Show Delivered POs in Estimates vs Orders (GC/TC Overview)

## Root Cause

In `useProjectFinancials.ts` (lines 201-208), `materialOrdered` is computed by:
1. Finding work orders that have a `linked_po_id`
2. Summing `po_line_items` from only those linked POs

This has two problems:
- **Standalone POs** (not linked to any work order) are never counted
- **No status filter** -- it doesn't check if the PO is actually ordered/delivered

The `FinancialSignalBar` card ("Supplier Est. vs Orders") and the `FinancialHealthCharts` bar chart both consume `materialOrdered` from this hook, so both show incorrect/missing values.

## Fix

Replace the linked-PO-only logic with a direct query of all project POs that have reached "ordered" status or beyond.

### File: `src/hooks/useProjectFinancials.ts`

**Remove** (lines 201-209):
```
const woIdsWithPO = wos.filter(wo => wo.linked_po_id).map(wo => wo.linked_po_id!);
if (woIdsWithPO.length > 0) {
  const { data: poItems } = await supabase
    .from('po_line_items')
    .select('po_id, line_total')
    .in('po_id', woIdsWithPO);
  const matOrdered = (poItems || []).reduce((sum, li) => sum + (li.line_total || 0), 0);
  setMaterialOrdered(matOrdered);
}
```

**Replace with**:
```
const { data: orderedPOs } = await supabase
  .from('purchase_orders')
  .select('id, sales_tax_percent, po_line_items(line_total)')
  .eq('project_id', projectId)
  .in('status', ['ORDERED', 'READY_FOR_DELIVERY', 'DELIVERED', 'FINALIZED']);

const matOrdered = (orderedPOs || []).reduce((sum, po) => {
  const subtotal = (po.po_line_items || []).reduce(
    (s: number, li: any) => s + (li.line_total || 0), 0
  );
  const taxRate = ((po as any).sales_tax_percent || 0) / 100;
  return sum + subtotal * (1 + taxRate);
}, 0);
setMaterialOrdered(matOrdered);
```

This:
- Queries **all** project POs, not just work-order-linked ones
- Filters to statuses that represent committed orders: ORDERED, READY_FOR_DELIVERY, DELIVERED, FINALIZED
- Includes sales tax for consistency with the supplier card calculation
- Feeds correct values into both the signal bar tile and the bar chart

No changes needed to `FinancialSignalBar.tsx` or `FinancialHealthCharts.tsx` -- they already read `materialOrdered` from the hook.

