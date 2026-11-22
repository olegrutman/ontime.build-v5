import { describe, expect, it, vi } from 'vitest';
import { finalizedCOApprovalAmount } from '@/lib/coLineReview';

const { update } = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'projects') return { select: () => ({ eq: () => ({ single: async () => ({ data: { sales_tax_rate: 0, labor_taxable: false } }) }) }) };
      if (table === 'co_line_items') return { select: () => ({ eq: async () => ({ data: [{ id: 'item-1' }], error: null }) }) };
      if (table === 'co_labor_entries') return { select: () => ({ eq: async () => ({ data: [{ co_line_item_id: 'item-1', org_id: 'subcontractor', entered_by_role: 'TC', is_actual_cost: false, line_total: 1500, crew_review_status: null }], error: null }) }) };
      return { update: (values: unknown) => { update(values); return { eq: async () => ({ error: null }) }; } };
    },
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