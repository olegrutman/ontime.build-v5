import { describe, expect, it } from 'vitest';
import { submittedLaborTotal, validateCoInvoiceRows } from '@/lib/coInvoiceRows';

describe('subcontractor-added invoice work', () => {
  it('freezes saved crew-derived and manual billable labor once', () => {
    expect(submittedLaborTotal([{ line_total: 3120 }, { line_total: 1000 }])).toBe(4120);
  });
  it('keeps both scope items and their billing provenance', () => {
    const rows = [{ label: 'Steel angles', amount: 3120, entryIds: ['derived'] }, { label: 'Weld studs', amount: 1000, entryIds: ['manual'] }];
    expect(validateCoInvoiceRows(rows, 4120)).toEqual(rows);
  });
  it('does not silently discard added work or exceed frozen approval', () => {
    expect(() => validateCoInvoiceRows([{ label: 'Steel angles', amount: 3120, entryIds: ['derived'] }, { label: 'Weld studs', amount: 1000, entryIds: ['manual'] }], 3120)).toThrow('approved remaining amount is $3120.00');
  });
});