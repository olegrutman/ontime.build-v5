/** A crew handoff is independent of the hiring company's upstream approval. */
export function canSendCrewPricing(isCrew: boolean, collaboratorStatus: string | null | undefined, orderStatus: string): boolean {
  return isCrew && collaboratorStatus === 'active' && !['withdrawn'].includes(orderStatus);
}