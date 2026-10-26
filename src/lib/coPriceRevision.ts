export function revisionPriceChange(previous: number, proposed: number): number {
  return Math.round((proposed - previous) * 100) / 100;
}

export function canSubmitPriceRevision(status: string, ownerOrgId: string, viewerOrgId: string, canCreate: boolean): boolean {
  return ['approved', 'contracted'].includes(status) && ownerOrgId === viewerOrgId && canCreate;
}

export function canDecidePriceRevision(status: string, recipientOrgId: string, viewerOrgId: string, canApprove: boolean): boolean {
  return status === 'pending' && recipientOrgId === viewerOrgId && canApprove;
}