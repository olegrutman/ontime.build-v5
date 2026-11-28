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
