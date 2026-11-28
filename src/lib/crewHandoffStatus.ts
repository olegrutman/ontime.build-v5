/**
 * Crew → subcontractor pricing handoff, resolved from the actual sender,
 * receiver and submission record. Saved prices alone never count as submitted.
 */
export type CrewHandoffState = 'not_requested' | 'waiting' | 'saved' | 'submitted' | 'creator';

export interface CrewHandoffInput {
  collaboratorStatus: 'active' | 'completed' | null;
  crewCreatedOrder: boolean;
  crewPricedTotal: number;
}

export function resolveCrewHandoff({ collaboratorStatus, crewCreatedOrder, crewPricedTotal }: CrewHandoffInput): CrewHandoffState {
  if (collaboratorStatus === 'completed') return 'submitted';
  if (collaboratorStatus === 'active') return crewPricedTotal > 0.005 ? 'saved' : 'waiting';
  return crewCreatedOrder ? 'creator' : 'not_requested';
}

const fmt = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** viewer = 'crew' for the crew company itself, 'hirer' for the company that hired it. */
export function crewHandoffMessage(
  state: CrewHandoffState,
  viewer: 'crew' | 'hirer',
  names: { crew: string; hirer: string },
  crewPricedTotal: number,
): { label: string; badge: string } {
  switch (state) {
    case 'saved':
      return viewer === 'crew'
        ? { label: `Pricing saved (${fmt(crewPricedTotal)}) — send it to ${names.hirer} when ready`, badge: 'Saved' }
        : { label: `Priced ${fmt(crewPricedTotal)} — ready for your review`, badge: 'Priced' };
    case 'waiting':
      return viewer === 'crew'
        ? { label: `Add your pricing, then send it to ${names.hirer}`, badge: 'In progress' }
        : { label: 'Pricing requested — nothing saved yet', badge: 'Requested' };
    case 'submitted':
      return viewer === 'crew'
        ? { label: `Pricing sent — ${names.hirer} to review`, badge: 'Sent' }
        : { label: 'Pricing sent — ready for your review', badge: 'Priced' };
    case 'creator':
      return { label: 'Created this work order and logged their pricing', badge: 'Received' };
    default:
      return { label: 'No crew requested yet', badge: '' };
  }
}
