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

  it('uses the full order identity in a single-order invoice number', async () => {
    expect(await buildInvoiceNumber({ projectId: 'project', projectName: 'Cherry Hills', fromOrgName: 'IMIS', toOrgName: 'Haley', coNumber: 'WO-5 C-PA-IM-0005' }))
      .toBe('INV-CHE-IM-HA-WO-5 C-PA-IM-0005-0001');
  });

  it('keeps the base-contract numbering unchanged', async () => {
    expect(await buildInvoiceNumber({ projectId: 'project', projectName: 'Cherry Hills', fromOrgName: 'IMIS', toOrgName: 'Haley' }))
      .toBe('INV-CHE-IM-HA-0001');
  });

  it('sequences references containing punctuation literally', async () => {
    like.mockResolvedValue({ data: [
      { invoice_number: 'INV-CHE-IM-HA-WO-A(1)-0003' },
      { invoice_number: 'INV-CHE-IM-HA-WO-A1-0099' },
    ] });
    expect(await buildInvoiceNumber({ projectId: 'project', projectName: 'Cherry Hills', fromOrgName: 'IMIS', toOrgName: 'Haley', coNumber: 'WO-A(1)' }))
      .toBe('INV-CHE-IM-HA-WO-A(1)-0004');
  });

  it('retains multi-order numbering rather than implying one source order', async () => {
    expect(await buildInvoiceNumber({ projectId: 'project', projectName: 'Cherry Hills', fromOrgName: 'IMIS', toOrgName: 'Haley', multiCoCount: 2, isTM: true }))
      .toBe('INV-CHE-IM-HA-WOMULTI-0001');
  });
});