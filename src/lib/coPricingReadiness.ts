import type { COStatus } from '@/types/changeOrder';

export type COPricingReadiness = 'unpriced' | 'incomplete' | 'ready';

interface PricingEntry {
  co_line_item_id: string;
  entered_by_role: string;
  is_actual_cost: boolean;
  line_total: number | null;
}

/** Only the viewer's billing entries can price scope, never downstream/private costs. */
export function getCOPricingReadiness(
  items: readonly { id: string }[],
  entries: readonly PricingEntry[],
  viewerRole: string | null,
  procurement: readonly { billed_amount: number | null }[] = [],
): COPricingReadiness {
  const billingRole = viewerRole === 'FC' ? 'FC' : 'TC';
  const pricedItems = items.filter(item => entries.some(entry =>
    entry.co_line_item_id === item.id && !entry.is_actual_cost &&
    entry.entered_by_role === billingRole && Number(entry.line_total) !== 0 &&
    Number.isFinite(Number(entry.line_total)),
  )).length;
  const pricedProcurement = procurement.filter(row =>
    Number.isFinite(Number(row.billed_amount)) && Number(row.billed_amount) !== 0,
  ).length;
  const total = items.length + procurement.length;
  const priced = pricedItems + pricedProcurement;
  if (total > 0 && priced === total) return 'ready';
  return priced > 0 ? 'incomplete' : 'unpriced';
}

/** A presentation hint, not a lifecycle transition or crew approval. */
export function coPricingStatusLabel(
  status: COStatus,
  readiness?: COPricingReadiness,
  keptInternal = false,
): string | undefined {
  if (keptInternal || !['draft', 'shared', 'work_in_progress', 'closed_for_pricing'].includes(status)) return;
  if (readiness === 'ready') return 'Priced · Awaiting submission';
  if (readiness === 'incomplete') return 'Pricing incomplete';
}