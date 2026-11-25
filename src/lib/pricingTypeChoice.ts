import type { COPricingType } from '@/types/changeOrder';

/** Plain-language guidance shown wherever a user picks Fixed / T&M / Not to exceed. */
export const PRICING_TYPE_GUIDE: Record<COPricingType, { name: string; what: string; bestFor: string; example: string; next: string }> = {
  fixed: {
    name: 'Fixed Price',
    what: 'You agree on one total before work starts. That is what gets paid, even if the job takes longer.',
    bestFor: 'Best when the scope is clear.',
    example: 'Example: Add a window — $2,400.',
    next: 'Next: enter the price on the order page and submit it for approval.',
  },
  tm: {
    name: 'Time & Materials',
    what: 'You agree on rates, not a total. Log hours, materials and equipment each day and bill what was actually used until the order is closed out.',
    bestFor: "Best when you can't know the scope yet.",
    example: 'Example: Repair hidden rot behind the siding.',
    next: 'Next: submit your rates for approval, then log daily tickets.',
  },
  nte: {
    name: 'Not to Exceed',
    what: 'Works like T&M, but with a maximum. Billing stops at the ceiling unless the other company approves an increase.',
    bestFor: 'Best when the scope is uncertain but the budget is fixed.',
    example: 'Example: Repair rot, up to $5,000.',
    next: 'Next: set the ceiling, submit for approval, then log daily tickets.',
  },
};

export type PricingTypeChangeMode = 'direct' | 'approval' | 'blocked';

/** Not yet submitted → the creator switches directly. Submitted or later → the other company must approve. */
export function pricingTypeChangeMode(co: { status?: string | null; completed_at?: string | null }, invoiced: boolean): PricingTypeChangeMode {
  if (invoiced || co.completed_at || co.status === 'withdrawn' || co.status === 'rejected') return 'blocked';
  return ['submitted', 'approved', 'contracted'].includes(co.status ?? '') ? 'approval' : 'direct';
}
