/**
 * Contract sum helpers.
 *
 * `project_contracts.contract_sum` is the REVISED contract value: it already
 * includes every approved change order (the DB trigger `apply_co_contract_delta`
 * pushes approved CO amounts into it and mirrors that portion into
 * `co_approved_sum`).
 *
 * Any KPI that shows "original contract" and then adds "approved CO adds" on top
 * must therefore start from the BASE value, or the change orders get counted
 * twice.
 */
export interface ContractSumShape {
  contract_sum?: number | null;
  co_approved_sum?: number | null;
  /** Original signed value, never touched by CO approvals. */
  original_contract_sum?: number | null;
}

/**
 * Contract value excluding approved change orders.
 * Prefers the stored original value; falls back to the derived subtraction for
 * rows written before `original_contract_sum` existed.
 */
export function baseContractSum(c?: ContractSumShape | null): number {
  if (!c) return 0;
  if (c.original_contract_sum != null) return Number(c.original_contract_sum) || 0;
  return Math.max((c.contract_sum || 0) - (c.co_approved_sum || 0), 0);
}

/** Contract value including approved change orders. */
export function revisedContractSum(c?: ContractSumShape | null): number {
  if (!c) return 0;
  if (c.original_contract_sum != null) {
    return (Number(c.original_contract_sum) || 0) + (c.co_approved_sum || 0);
  }
  return c.contract_sum || 0;
}


/** Approved change-order portion baked into `contract_sum`. */
export function coApprovedPortion(c?: ContractSumShape | null): number {
  return c?.co_approved_sum || 0;
}
