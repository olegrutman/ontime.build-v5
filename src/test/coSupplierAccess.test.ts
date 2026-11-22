import { describe, expect, it } from 'vitest';
import { hasAcceptedSupplierParticipant } from '@/lib/coSupplierAccess';

describe('change-order supplier routing', () => {
  const supplierOrg = 'supplier-org';

  it('allows an accepted supplier on the project', () => {
    expect(hasAcceptedSupplierParticipant([
      { organization_id: supplierOrg, role: 'SUPPLIER', invite_status: 'ACCEPTED' },
    ], supplierOrg)).toBe(true);
  });

  it('blocks pending, missing, and non-supplier relationships', () => {
    expect(hasAcceptedSupplierParticipant([
      { organization_id: supplierOrg, role: 'SUPPLIER', invite_status: 'PENDING' },
    ], supplierOrg)).toBe(false);
    expect(hasAcceptedSupplierParticipant([], supplierOrg)).toBe(false);
    expect(hasAcceptedSupplierParticipant([
      { organization_id: supplierOrg, role: 'TC', invite_status: 'ACCEPTED' },
    ], supplierOrg)).toBe(false);
  });
});
