import { describe, it, expect } from 'vitest';
import { releaseEditedInvoice } from '@/lib/woInvoiceEdit';

describe('editing a work-order draft invoice', () => {
  it('releases only that invoice’s amounts and entries', () => {
    const billed = new Map([['wo', { billed: 5000, draft: 19120.5, entryIds: new Set(['e1', 'e2']), legacyFullyBilled: false }]]);
    const balances = new Map([['wo', { grand_total: 63735, already_billed: 24120.5, remaining: 39614.5 }]]);
    const out = releaseEditedInvoice(billed, balances, [
      { source_co_id: 'wo', source_entry_ids: ['e2'], current_billed: 19120.5, billed_percent: 30, description: '' },
    ]);
    expect(out.billed.get('wo')!.billed).toBe(5000);
    expect(out.billed.get('wo')!.draft).toBe(0);
    expect([...out.billed.get('wo')!.entryIds]).toEqual(['e1']);
    expect(out.balances.get('wo')!.remaining).toBe(58735);
    expect(out.balances.get('wo')!.grand_total).toBe(63735);
  });
});
