/**
 * The GC's owner-facing price lives on exactly one row: the Owner → General
 * Contractor contract, where the property owner is an external party and so has
 * no organization id (`from_org_id` is null, the GC sits in `to_org_id`).
 *
 * Two columns have historically carried that price — `owner_contract_value`
 * (project KPIs, dashboard revenue) and `contract_sum` (setup wizard, the SOV
 * page's contract total). Reading or writing only one of them lets the overview
 * and the dashboard print different numbers, so every read uses
 * `resolveOwnerPrice` and every write sets both.
 */
export interface OwnerContractLike {
  id?: string;
  from_role: string;
  to_role: string;
  contract_sum?: number | null;
  owner_contract_value?: number | null;
  to_org_id?: string | null;
}

/**
 * The Owner → GC prime-contract row. When the viewer's GC org is known, rows
 * belonging to a different GC are skipped so a multi-GC project can never bill
 * off another company's prime contract; owner rows with no org id still match.
 */
export function findOwnerContractRow<T extends OwnerContractLike>(
  contracts: T[],
  gcOrgId?: string | null,
): T | undefined {
  return contracts.find(
    (c) =>
      c.from_role === 'Owner' &&
      c.to_role === 'General Contractor' &&
      (!gcOrgId || !c.to_org_id || c.to_org_id === gcOrgId),
  );
}

/**
 * The price carried by one owner row: an explicit owner value wins (including an
 * explicit 0, which is a deliberate "no price yet" from setup), otherwise a
 * positive contract sum, otherwise nothing is known.
 */
export function ownerPriceOf(row?: OwnerContractLike | null): number | null {
  if (!row) return null;
  const explicit = row.owner_contract_value;
  if (explicit !== null && explicit !== undefined && Number.isFinite(Number(explicit))) {
    return Number(explicit);
  }
  const sum = Number(row.contract_sum || 0);
  return sum > 0 ? sum : null;
}

/**
 * The GC's revenue baseline for a project: the owner prime contract first, then
 * an owner value recorded on the primary contract (legacy rows), else null.
 */
export function resolveOwnerPrice(
  contracts: OwnerContractLike[],
  gcOrgId?: string | null,
  fallback?: OwnerContractLike | null,
): number | null {
  const fromOwnerRow = ownerPriceOf(findOwnerContractRow(contracts, gcOrgId));
  if (fromOwnerRow !== null) return fromOwnerRow;
  const legacy = fallback?.owner_contract_value;
  if (legacy !== null && legacy !== undefined && Number.isFinite(Number(legacy))) {
    return Number(legacy);
  }
  return null;
}
