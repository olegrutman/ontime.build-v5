import { beforeEach, describe, expect, it, vi } from 'vitest';

const { like } = vi.hoisted(() => ({ like: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ like }) }) }) },
}));

import { buildInvoiceNumber, coTag, invoiceOrderReference } from '@/lib/invoiceNumber';

describe('full invoice order references', () => {
  beforeEach(() => like.mockResolvedValue({ data: [] }));

  it('preserves the exact work order reference from the order page', () => {
    expect(invoiceOrderReference('WO-5 C-PA-IM-0005')).toBe('WO-5 C-PA-IM-0005');
  });

  it('preserves the complete change order reference', () => {
    expect(coTag('CO-FUL-IM-HA-0001')).toBe('CO-FUL-IM-HA-0001');
  });

  it('numbers a work order invoice as PROJ-W01', async () => {
    expect(await buildInvoiceNumber({ projectId: 'p', projectName: 'The Knowles Residence', coNumber: 'WO-KNO-IM-HA-0004' }))
      .toBe('KNO-W01');
  });

  it('numbers a change order invoice as PROJ-C01', async () => {
    expect(await buildInvoiceNumber({ projectId: 'p', projectName: 'Cherry Hills', coNumber: 'CO-CHE-IM-HA-0001' }))
      .toBe('CHE-C01');
  });

  it('numbers contract billing as PROJ-001 and continues its own sequence', async () => {
    like.mockResolvedValue({ data: [
      { invoice_number: 'CHE-002' }, { invoice_number: 'CHE-W07' }, { invoice_number: 'INV-CHE-IM-HA-0009' },
    ] });
    expect(await buildInvoiceNumber({ projectId: 'p', projectName: 'Cherry Hills' })).toBe('CHE-003');
  });

  it('keeps multi-order invoices on the order sequence', async () => {
    like.mockResolvedValue({ data: [{ invoice_number: 'CHE-W02' }] });
    expect(await buildInvoiceNumber({ projectId: 'p', projectName: 'Cherry Hills', multiCoCount: 2, isTM: true }))
      .toBe('CHE-W03');
  });

  it('stays at 8 characters or fewer', async () => {
    like.mockResolvedValue({ data: [{ invoice_number: 'CHE-W99' }] });
    const n = await buildInvoiceNumber({ projectId: 'p', projectName: 'Cherry Hills', coNumber: 'WO-1' });
    expect(n).toBe('CHE-W100');
    expect(n.length).toBeLessThanOrEqual(8);
  });
});

import { projectCode as _projectCode, orgInitials as _orgInitials } from '@/lib/invoiceNumber';
describe('number prefixes ignore spaces and symbols', () => {
  it('"QA TEST Remodel 1" -> "QAT" (no space)', () => {
    expect(_projectCode('QA TEST Remodel 1')).toBe('QAT');
  });
  it('"TC_Test" -> "TC"', () => {
    expect(_orgInitials('TC_Test')).toBe('TC');
  });
  it('"A B" org -> "AB"', () => {
    expect(_orgInitials('A B Framing')).toBe('AB');
  });
});
