import { supabase } from '@/integrations/supabase/client';

interface WorkOrderWithMarkup {
  id: string;
  labor_total: number;
  material_total: number;
  equipment_total: number;
  final_price: number;
  linked_po_id: string | null;
  material_markup_type: string | null;
  material_markup_percent: number | null;
  material_markup_amount: number | null;
}

/**
 * Fetches PO line item subtotals for work orders with linked POs,
 * then computes the true total (labor + materials w/ markup + equipment).
 */
export async function enrichWorkOrderTotals(
  workOrders: WorkOrderWithMarkup[]
): Promise<Map<string, number>> {
  const totalsMap = new Map<string, number>();

  // Collect linked PO IDs
  const poIds = workOrders
    .filter(wo => wo.linked_po_id)
    .map(wo => wo.linked_po_id as string);

  // Batch fetch PO line item subtotals
  let poSubtotals = new Map<string, number>();
  if (poIds.length > 0) {
    const { data: lineItems } = await supabase
      .from('po_line_items')
      .select('po_id, line_total')
      .in('po_id', poIds);

    for (const item of lineItems || []) {
      const current = poSubtotals.get(item.po_id) || 0;
      poSubtotals.set(item.po_id, current + (item.line_total || 0));
    }
  }

  for (const wo of workOrders) {
    const labor = wo.labor_total || 0;
    const equipment = wo.equipment_total || 0;

    let materialTotal = wo.material_total || 0;

    if (wo.linked_po_id) {
      const baseMatTotal = poSubtotals.get(wo.linked_po_id) || 0;
      if (baseMatTotal > 0) {
        let markupAmt = 0;
        if (wo.material_markup_type === 'percent' && wo.material_markup_percent) {
          markupAmt = baseMatTotal * (wo.material_markup_percent / 100);
        } else if (wo.material_markup_type === 'lump_sum' && wo.material_markup_amount) {
          markupAmt = wo.material_markup_amount;
        }
        materialTotal = baseMatTotal + markupAmt;
      }
    }

    totalsMap.set(wo.id, labor + materialTotal + equipment);
  }

  return totalsMap;
}
