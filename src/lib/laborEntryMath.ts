import { toCents } from '@/lib/money';

export interface LaborEntryMathInput {
  mode: 'hourly' | 'lump_sum';
  hours?: number | null;
  rate?: number | null;
  lumpSum?: number | null;
  isTC: boolean;
  isActualCost: boolean;
  markupPercent?: number | null;
}

/**
 * One cents-based calculation for the pricing form preview and persisted rate.
 * Private actual costs never carry markup; markup belongs only on TC billables.
 */
export function calculateLaborEntryAmount({
  mode,
  hours = 0,
  rate = 0,
  lumpSum = 0,
  isTC,
  isActualCost,
  markupPercent = 0,
}: LaborEntryMathInput) {
  const safeHours = Number(hours) || 0;
  const safeRate = Number(rate) || 0;
  const safeLump = Number(lumpSum) || 0;
  const effectiveMarkup = !isActualCost && isTC && Number(markupPercent) > 0 ? Number(markupPercent) : 0;
  const baseTotal = toCents(mode === 'hourly' ? safeHours * safeRate : safeLump);
  const effectiveRate = mode === 'hourly' ? toCents(safeRate * (1 + effectiveMarkup / 100)) : null;
  const effectiveLumpSum = mode === 'lump_sum' ? toCents(safeLump * (1 + effectiveMarkup / 100)) : null;
  const total = toCents(mode === 'hourly' ? safeHours * (effectiveRate ?? 0) : (effectiveLumpSum ?? 0));
  const markupAmount = toCents(total - baseTotal);
  return { baseTotal, effectiveMarkup, effectiveRate, effectiveLumpSum, markupAmount, total };
}

export interface ActualCostRow {
  pricing_mode?: string | null;
  hours?: number | null;
  base_hourly_rate?: number | null;
  base_lump_sum?: number | null;
  line_total?: number | null;
}

/** Historical marked-up rows still read as their true base cost before normalization. */
export function actualEntryBaseCost(row: ActualCostRow): number {
  if (row.pricing_mode === 'hourly' && row.base_hourly_rate != null) {
    return toCents(Number(row.hours ?? 0) * Number(row.base_hourly_rate));
  }
  if (row.pricing_mode === 'lump_sum' && row.base_lump_sum != null) {
    return toCents(Number(row.base_lump_sum));
  }
  return toCents(Number(row.line_total ?? 0));
}
