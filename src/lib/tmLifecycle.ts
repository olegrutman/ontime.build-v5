/** Continuous T&M lifecycle: rates are set up, then dated tickets accrue until close-out. */
export type TMPhase = 'setup' | 'collecting' | 'closed' | 'not_tm';

export function tmOrderPhase(co: { pricing_type?: string | null; status?: string | null; completed_at?: string | null }): TMPhase {
  if (co.pricing_type !== 'tm' && co.pricing_type !== 'nte') return 'not_tm';
  if (co.completed_at) return 'closed';
  if (co.status === 'approved' || co.status === 'contracted') return 'collecting';
  return 'setup';
}

/** Only an open (authorized, not closed) T&M/NTE order accepts new billable tickets after setup. */
export function canAddTMTicket(co: Parameters<typeof tmOrderPhase>[0]): boolean {
  const phase = tmOrderPhase(co);
  return phase !== 'closed';
}
