import { describe, expect, it, vi } from 'vitest';
import { finalizedCOApprovalAmount } from '@/lib/coLineReview';

const { update } = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => table === 'projects'
      ? { select: () => ({ eq: () => ({ single: async () => ({ data: { sales_tax_rate: 0, labor_taxable: false } }) }) }) }
      : { update: (values: unknown) => { update(values); return { eq: async () => ({ error: null }) }; } },
  },
}));

import { snapshotCOSubmission } from '@/lib/coSubmitPrep';

describe('rejected CO/WO resubmission', () => {
  it('saves the revised $1,500 proposal, not the rejected $0 review result', async () => {
    const reviewed = { status: 'rejected', approved_amount: 0 };
    const revisedLabor = 1200;
    const responsibilityAwareMaterials = 300;
    const billableGrandTotal = finalizedCOApprovalAmount(reviewed) ?? (revisedLabor + responsibilityAwareMaterials);
    await snapshotCOSubmission({
      coId: 'rejected-order', projectId: 'project', currentOrgId: 'subcontractor',
      isTC: true, useFcPricingBase: false,
      financials: { billableGrandTotal, laborTotal: revisedLabor, billableMaterialsTotal: responsibilityAwareMaterials },
    });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ tc_submitted_price: 1500 }));
  });
});