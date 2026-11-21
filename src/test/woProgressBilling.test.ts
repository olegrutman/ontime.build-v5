import { describe, it, expect } from 'vitest';
import { woBillingSummary, fixedProgressAmount, clampToRemaining, hasBillableBalance } from '@/lib/woProgressBilling';
import { applyWoInvoiceLine, isTaxInvoiceLine, type WoBilledInfo } from '@/lib/woProgressBillingData';

describe('WO progress billing', () => {
  it('fixed price: 60% of $25,475 bills $15,285', () => {
    expect(fixedProgressAmount(25475, 60, 0)).toBe(15285);
  });

  it('fixed price: second claim never exceeds remaining balance', () => {
    expect(fixedProgressAmount(25475, 60, 15285)).toBe(10190);
  });

  it('caps a $210 order at $105 when a $105 draft already reserves half', () => {
    expect(fixedProgressAmount(210, 100, 105)).toBe(105);
  });

  it('final true-up bills exactly the remaining balance', () => {
    const s = woBillingSummary(25475, 15285);
    expect(s.remaining).toBe(10190);
    expect(s.status).toBe('partially_billed');
  });

  it('NTE cap limits cumulative billing', () => {
    const s = woBillingSummary(12000, 9000, 10000);
    expect(s.limit).toBe(10000);
    expect(clampToRemaining(2500, s)).toBe(1000);
  });

  it('status is fully billed at the approved value', () => {
    expect(woBillingSummary(6332, 6332).status).toBe('fully_billed');
    expect(woBillingSummary(6332, 0).status).toBe('unbilled');
  });

  it('opens a new $420 order and a $210 balance, but not a fully billed order', () => {
    expect(hasBillableBalance({ remaining: 420 })).toBe(true);
    expect(hasBillableBalance({ remaining: 210 })).toBe(true);
    expect(hasBillableBalance({ remaining: 0 })).toBe(false);
    expect(hasBillableBalance(null)).toBe(false);
  });

  it('shows a $1,550 draft separately: $0 billed while reserving its source entry', () => {
    const info: WoBilledInfo = { billed: 0, draft: 0, entryIds: new Set(), legacyFullyBilled: false };
    applyWoInvoiceLine(info, 'DRAFT', { source_co_id: 'co-1', source_entry_ids: ['entry-1'], current_billed: 1550 });
    expect(info.billed).toBe(0);
    expect(info.draft).toBe(1550);
    expect(info.entryIds.has('entry-1')).toBe(true);
    expect(woBillingSummary(5862.50, info.billed).remaining).toBe(5862.50);
  });

  it('keeps sales tax outside the approved pre-tax work balance', () => {
    const info: WoBilledInfo = { billed: 0, draft: 0, entryIds: new Set(), legacyFullyBilled: false };
    applyWoInvoiceLine(info, 'APPROVED', { source_co_id: 'co-1', current_billed: 100, description: 'CO-1 · Framing' });
    applyWoInvoiceLine(info, 'APPROVED', { source_co_id: 'co-1', current_billed: 8.25, description: 'Sales Tax (8.25%)' });
    applyWoInvoiceLine(info, 'DRAFT', { source_co_id: 'co-1', current_billed: 8.25, description: 'Tax' });
    expect(info.billed).toBe(100);
    expect(info.draft).toBe(0);
    expect(isTaxInvoiceLine('Tax (8.25%)')).toBe(true);
    expect(isTaxInvoiceLine('Framing labor')).toBe(false);
  });

  it('counts submitted, approved and paid lines as billed but never rejected lines', () => {
    const info: WoBilledInfo = { billed: 0, draft: 0, entryIds: new Set(), legacyFullyBilled: false };
    for (const status of ['SUBMITTED', 'APPROVED', 'PAID']) {
      applyWoInvoiceLine(info, status, { source_co_id: 'co-1', current_billed: 100 });
    }
    applyWoInvoiceLine(info, 'REJECTED', { source_co_id: 'co-1', current_billed: 500 });
    expect(info.billed).toBe(300);
    expect(info.draft).toBe(0);
  });
});
