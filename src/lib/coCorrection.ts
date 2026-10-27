export interface OrderCorrection {
  co_id: string;
  from_org_id: string;
  to_org_id: string | null;
  version: number;
  approved_version: number;
  submitted_version: number | null;
  state: string;
  changed_at: string;
}

export function correctionLabel(correction?: OrderCorrection | null): string | null {
  if (!correction || correction.version <= correction.approved_version) return null;
  return correction.state === 'pending' ? 'Correction · Awaiting approval' : 'Modified · Correction needed';
}

export function correctionNeedsAction(correction: OrderCorrection | null | undefined, orgId: string | null): boolean {
  if (!correctionLabel(correction)) return false;
  return correction?.state === 'pending' ? correction.to_org_id === orgId : correction?.from_org_id === orgId;
}