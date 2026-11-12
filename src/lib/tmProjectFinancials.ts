/** T&M/remodel project costs are additive: base commitments plus approved WOs. */
export function addApprovedWorkOrderCosts(baseCommittedCosts: number, approvedOrderCosts: number): number {
  return baseCommittedCosts + approvedOrderCosts;
}
