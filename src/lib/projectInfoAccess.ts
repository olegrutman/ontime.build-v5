export interface InfoContract {
  id: string;
  from_org_id: string | null;
  to_org_id: string | null;
  from_role: string;
  to_role: string;
  contract_sum: number | null;
  created_by_user_id?: string | null;
  status?: string | null;
  trade?: string | null;
}

export function isInfoCreator(creator: string | null | undefined, userId: string | undefined): boolean {
  return Boolean(userId && creator === userId);
}

export function ownInfoContracts<T extends InfoContract>(contracts: T[], orgId: string | undefined): T[] {
  if (!orgId) return [];
  return contracts.filter(c => c.from_org_id === orgId || c.to_org_id === orgId);
}

export function infoContractValue(contracts: InfoContract[], orgId: string | undefined, orgType: string | undefined): number | null {
  const own = ownInfoContracts(contracts, orgId).filter(c => !['Work Order', 'Work Order Labor'].includes(c.trade || ''));
  // Owner agreements are recorded Owner → General Contractor; all other
  // agreements follow the billing direction: earning company → paying company.
  const earning = own.filter(c => orgType === 'GC'
    ? c.from_role.toLowerCase() === 'owner' && c.to_org_id === orgId
    : c.from_org_id === orgId);
  return earning.length ? earning.reduce((sum, c) => sum + Number(c.contract_sum || 0), 0) : null;
}

export function canEditInfoContract(contract: InfoContract, userId: string | undefined): boolean {
  return isInfoCreator(contract.created_by_user_id, userId)
    && !['approved', 'executed', 'accepted', 'locked'].includes((contract.status || '').toLowerCase());
}