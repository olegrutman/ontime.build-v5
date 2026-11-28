import type { COLaborEntry, COLineItem } from '@/types/changeOrder';

/** Where the crew ↔ hiring-company agreement stands for one item. */
export type CrewAgreementStatus = 'none' | 'not_sent' | 'waiting' | 'accepted' | 'rejected';

/** Which agreement(s) a viewer is party to on this order. */
export type AgreementView = 'upstream' | 'crew' | 'both';

/**
 * Crew pricing is only reviewable once the crew sends it (fixed price);
 * T&M/NTE tickets are reviewed as they arrive.
 */
export function crewItemStatus(entries: Pick<COLaborEntry, 'entered_by_role' | 'is_actual_cost' | 'crew_review_status'>[], submitted: boolean): CrewAgreementStatus {
  const crew = entries.filter(e => e.entered_by_role === 'FC' && !e.is_actual_cost);
  if (crew.length === 0) return 'none';
  if (crew.some(e => e.crew_review_status === 'rejected')) return 'rejected';
  if (crew.every(e => e.crew_review_status === 'approved' || e.crew_review_status == null)) {
    return crew.some(e => e.crew_review_status === 'approved') ? 'accepted' : (submitted ? 'waiting' : 'not_sent');
  }
  return submitted ? 'waiting' : 'not_sent';
}

export function crewStatusLabel(status: CrewAgreementStatus): string {
  switch (status) {
    case 'not_sent': return 'Not sent';
    case 'waiting': return 'Waiting for review';
    case 'accepted': return 'Accepted';
    case 'rejected': return 'Sent back';
    default: return 'Not priced';
  }
}

export function upstreamStatusLabel(status: COLineItem['approval_status'] | undefined): string {
  return status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending review';
}

/** Crew pricing counts as sent for fixed price only after the crew's explicit handoff. */
export function crewPricingSent(pricingType: string | null | undefined, collaborators: { status: string }[]): boolean {
  return pricingType !== 'fixed' || collaborators.some(c => c.status === 'completed');
}

interface ViewerInput {
  isGC: boolean; isTC: boolean; isFC: boolean;
  coOrgId: string | null | undefined;
  myOrgId: string | null | undefined;
  collaborators: { organization_id: string }[];
}

/** Which agreements a company is party to on an order. */
export function agreementViewFor({ isTC, isFC, coOrgId, myOrgId, collaborators }: ViewerInput): AgreementView {
  if (isFC && coOrgId !== myOrgId && collaborators.some(c => c.organization_id === myOrgId)) return 'crew';
  if (isTC && collaborators.length > 0) return 'both';
  return 'upstream';
}

/** Tags a viewer may see: crews never see the upstream agreement, the general contractor never sees crew pricing. */
export function visibleAgreements(view: AgreementView): { upstream: boolean; crew: boolean } {
  return { upstream: view !== 'crew', crew: view !== 'upstream' };
}

/** The crew-cost vs approved-price warning belongs to the hiring company only. */
export function showCrewMarginWarning(view: AgreementView, crewTotal: number, approvedPrice: number): boolean {
  return view === 'both' && crewTotal > 0 && approvedPrice > 0 && crewTotal > approvedPrice + 0.005;
}

/** A crew on another company's order may complete an item only after its hiring company accepted that item's pricing. */
export function crewMayComplete(view: AgreementView, crewStatus: CrewAgreementStatus): boolean {
  return view !== 'crew' || crewStatus === 'accepted';
}
