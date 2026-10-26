// Work-order progress billing math. Pure helpers shared by the invoice dialog
// and the WO detail "Billed to date" bar. Billed-to-date is always derived from
// invoice lines (never stored), mirroring SOV billing status.

export type WoBillingStatus = 'unbilled' | 'partially_billed' | 'fully_billed';

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface WoBillingSummary {
  limit: number;
  billed: number;
  remaining: number;
  percentBilled: number;
  status: WoBillingStatus;
}

/** value = approved WO value; cap = NTE cap (limits value when set). */
export function woBillingSummary(value: number, billedToDate: number, cap?: number | null): WoBillingSummary {
  const v = r2(value);
  const limit = cap && cap > 0 ? (v > 0 ? Math.min(v, r2(cap)) : r2(cap)) : v;
  const billed = r2(billedToDate);
  const remaining = r2(Math.max(0, limit - billed));
  const percentBilled = limit > 0 ? Math.min(100, Math.round((billed / limit) * 1000) / 10) : 0;
  const status: WoBillingStatus =
    billed <= 0 ? 'unbilled' : billed >= limit - 0.005 ? 'fully_billed' : 'partially_billed';
  return { limit, billed, remaining, percentBilled, status };
}

/** Fixed price: dollars for this period's percent of the approved value, never past the remaining balance. */
export function fixedProgressAmount(value: number, percentThisPeriod: number, billedToDate: number): number {
  const pct = Math.max(0, Math.min(100, Number(percentThisPeriod) || 0));
  const s = woBillingSummary(value, billedToDate);
  return r2(Math.min(s.remaining, r2(value) * pct / 100));
}

/** Clamp a requested amount to what is still billable on the WO. */
export function clampToRemaining(amount: number, summary: WoBillingSummary): number {
  return r2(Math.max(0, Math.min(r2(amount), summary.remaining)));
}

export const WO_BILLING_LABEL: Record<WoBillingStatus, string> = {
  unbilled: 'Unbilled',
  partially_billed: 'Partially billed',
  fully_billed: 'Fully billed',
};
