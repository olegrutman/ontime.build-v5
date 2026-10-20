import { describe, expect, it } from 'vitest';
import { canEditInfoContract, infoContractValue, isInfoCreator, ownInfoContracts } from '@/lib/projectInfoAccess';

const contracts = [
  { id: 'owner', from_org_id: null, to_org_id: 'gc', from_role: 'Owner', to_role: 'General Contractor', contract_sum: 100000 },
  { id: 'sub', from_org_id: 'tc', to_org_id: 'gc', from_role: 'Subcontractor', to_role: 'General Contractor', contract_sum: 60000 },
  { id: 'crew', from_org_id: 'fc', to_org_id: 'tc', from_role: 'Crew', to_role: 'Subcontractor', contract_sum: 20000 },
  { id: 'supply', from_org_id: 'supplier', to_org_id: 'gc', from_role: 'Supplier', to_role: 'General Contractor', contract_sum: 15000 },
];
describe('Project Info company relevance', () => {
  it('Crew sees the hired contract price, never the subcontractor price', () => {
    expect(infoContractValue(contracts, 'fc', 'FC')).toBe(20000);
    expect(ownInfoContracts(contracts, 'fc').map(c => c.id)).toEqual(['crew']);
  });
  it('Subcontractor uses its upstream price, not upstream plus crew spending', () => {
    expect(infoContractValue(contracts, 'tc', 'TC')).toBe(60000);
    expect(ownInfoContracts(contracts, 'tc').map(c => c.id)).toEqual(['sub', 'crew']);
  });
  it('General Contractor uses owner value without adding subcontract costs', () => {
    expect(infoContractValue(contracts, 'gc', 'GC')).toBe(100000);
    expect(ownInfoContracts(contracts, 'gc').map(c => c.id)).toEqual(['owner', 'sub', 'supply']);
  });
  it('Supplier uses only its supply price', () => {
    expect(infoContractValue(contracts, 'supplier', 'SUPPLIER')).toBe(15000);
    expect(ownInfoContracts(contracts, 'supplier').map(c => c.id)).toEqual(['supply']);
  });
  it('missing company never exposes contracts or fabricates a value', () => {
    expect(ownInfoContracts(contracts, undefined)).toEqual([]);
    expect(infoContractValue(contracts, 'other', 'FC')).toBeNull();
  });
  it('only the actual project creator can edit shared info', () => {
    expect(isInfoCreator('creator', 'creator')).toBe(true);
    expect(isInfoCreator('creator', 'invited-admin')).toBe(false);
    expect(isInfoCreator(null, undefined)).toBe(false);
  });
  it('only the contract creator can edit an unlocked contract', () => {
    const c = { ...contracts[2], created_by_user_id: 'contract-creator', status: 'Draft' };
    expect(canEditInfoContract(c, 'contract-creator')).toBe(true);
    expect(canEditInfoContract(c, 'project-creator')).toBe(false);
    expect(canEditInfoContract({ ...c, status: 'Approved' }, 'contract-creator')).toBe(false);
  });
});