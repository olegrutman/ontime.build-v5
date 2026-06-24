export type SovPercentMode = "original" | "allocated";

export interface SovPercentInputItem {
  id?: string;
  name?: string;
  is_active?: boolean;
  is_from_change_order?: boolean;
  original_amount: number;
  allocated_amount: number;
}

export interface SovPercentComputation {
  active_sov_id?: string;
  included_count: number;
  total_original: number;
  total_allocated: number;
  sum_original_percent: number; // 0..1
  sum_allocated_percent: number; // 0..1
  original_percent_by_index: number[]; // 0..1
  allocated_percent_by_index: number[]; // 0..1
  zero_total_warning: boolean;
  percent_mismatch_warning: boolean;
}

const DEFAULT_TOLERANCE = 0.0001; // 0.01% in fraction space

function safeDiv(n: number, d: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return 0;
  return n / d;
}

/**
 * Single source of truth for Original% + Allocated%.
 * - Uses raw numeric amounts (never formatted/rounded strings)
 * - Excludes inactive items from denominators
 * - If denominator is 0 => percents are 0 and zero_total_warning=true
 */
export function computeSovPercents(
  items: SovPercentInputItem[],
  opts?: {
    activeSovId?: string;
    tolerance?: number; // fraction space, default 0.0001 (~0.01%)
    debugLabel?: string;
  }
): SovPercentComputation {
  const tolerance = opts?.tolerance ?? DEFAULT_TOLERANCE;
  const included = items.filter((i) => i.is_active !== false);

  const totalOriginal = included.reduce((s, i) => s + (Number(i.original_amount) || 0), 0);
  const totalAllocated = included.reduce((s, i) => s + (Number(i.allocated_amount) || 0), 0);

  const zeroTotalWarning = totalOriginal === 0 || totalAllocated === 0;

  const originalPercents = items.map((i) =>
    i.is_active === false ? 0 : safeDiv(Number(i.original_amount) || 0, totalOriginal)
  );
  const allocatedPercents = items.map((i) =>
    i.is_active === false ? 0 : safeDiv(Number(i.allocated_amount) || 0, totalAllocated)
  );

  const sumOriginal = originalPercents.reduce((s, v) => s + v, 0);
  const sumAllocated = allocatedPercents.reduce((s, v) => s + v, 0);

  const percentMismatchWarning =
    !zeroTotalWarning &&
    (Math.abs(sumOriginal - 1) > tolerance || Math.abs(sumAllocated - 1) > tolerance);

  if (opts?.debugLabel) {
    // Internal debug check (non-user-facing)
    console.debug(`[SOV% debug] ${opts.debugLabel}`, {
      active_sov_id: opts.activeSovId,
      total_original: totalOriginal,
      total_allocated: totalAllocated,
      sum_original_percent: sumOriginal,
      sum_allocated_percent: sumAllocated,
      included_count: included.length,
    });
  }

  return {
    active_sov_id: opts?.activeSovId,
    included_count: included.length,
    total_original: totalOriginal,
    total_allocated: totalAllocated,
    sum_original_percent: sumOriginal,
    sum_allocated_percent: sumAllocated,
    original_percent_by_index: originalPercents,
    allocated_percent_by_index: allocatedPercents,
    zero_total_warning: zeroTotalWarning,
    percent_mismatch_warning: percentMismatchWarning,
  };
}

export function formatPercent(pct01: number, decimals = 2): string {
  const v = (Number(pct01) || 0) * 100;
  return `${v.toFixed(decimals)}%`;
}
