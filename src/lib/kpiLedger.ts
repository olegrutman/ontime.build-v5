/**
 * Canonical project KPI ledger.
 *
 * Every financial KPI card in the app reads its numbers from this one place so
 * labels and math can never drift between roles. Rules baked in here:
 *
 *  1. Tax never mixes. Contract-basis terms (contracts, % complete) use pre-tax
 *     subtotals. Cash-basis terms (collected / paid) use tax-inclusive totals.
 *  2. Responsibility gates cost. Materials/equipment only count as MY cost when
 *     my org is the responsible party (mirrors the DB `co_grand_total`).
 *  3. Approved COs are the only COs in revenue. Pending COs are exposure only.
 *  4. `original_contract_sum` is the signed base value and never moves. The
 *     revised value is `original_contract_sum + co_approved_sum` (older rows
 *     without an original fall back to `contract_sum - co_approved_sum`).

 */

import { baseContractSum } from '@/lib/contractSums';

export type LedgerRole =
  | 'General Contractor'
  | 'Trade Contractor'
  | 'Field Crew'
  | 'Supplier';

/** How a number was measured — printed on every card so a basis can't be mixed silently. */
export type Basis = 'contract' | 'cash' | 'forecast';

export interface LedgerContract {
  id: string;
  from_role: string;
  to_role: string;
  from_org_id: string | null;
  to_org_id: string | null;
  contract_sum: number;
  co_approved_sum?: number | null;
  original_contract_sum?: number | null;
  /** Lifecycle status — used to prefer a live contract over a stale invite. */
  status?: string | null;

  retainage_percent?: number | null;
  trade?: string | null;
}


export interface LedgerInput {
  role: LedgerRole;
  /** Org ids the viewer belongs to. */
  myOrgIds: string[];
  contracts: LedgerContract[];
  /** Owner contract value (GC revenue instrument). */
  ownerContractValue?: number | null;

  // CO/WO aggregates, already viewer-scoped and responsibility-gated.
  approvedCORevenue: number;
  approvedCOCost: number;
  pendingCORevenue: number;
  pendingCOCost: number;

  /** Approved supplier estimates / POs the viewer owns (tax-inclusive). */
  materialCommitment: number;
  /** True when the viewer is the party responsible for materials. */
  materialsAreMine: boolean;

  // Receivables (my revenue side) — pre-tax invoiced, tax-in collected.
  billed: number;
  collected: number;
  retainageHeld: number;
  receivablesPendingAmount: number;
  receivablesPendingCount: number;

  // Payables (what others bill me).
  payablesApproved: number;
  payablesPaid: number;
  payablesPendingAmount: number;
  payablesPendingCount: number;

  /**
   * Cost actually incurred so far (accrual): invoices billed to me + my own
   * internal labor burden. Margin-to-date measures billed revenue against THIS,
   * never against a percentage slice of the forecast cost.
   */
  actualCostToDate?: number;
}


export interface LedgerTerm {
  value: number;
  /** Human-readable math, printed on the card. */
  formula: string;
  basis: Basis;
  /** False when an input is missing — cards render "Not set" instead of $0. */
  known: boolean;
}

export interface ProjectLedger {
  role: LedgerRole;
  baseContract: LedgerTerm;
  approvedCOAdds: LedgerTerm;
  pendingCOAdds: LedgerTerm;
  revisedContract: LedgerTerm;
  baseCost: LedgerTerm;
  coCost: LedgerTerm;
  materialCommitment: LedgerTerm;
  revisedCost: LedgerTerm;
  forecastMargin: LedgerTerm;
  forecastMarginPct: number;
  billed: LedgerTerm;
  collected: LedgerTerm;
  retainageHeld: LedgerTerm;
  percentComplete: number;
  earnedRevenue: LedgerTerm;
  earnedCost: LedgerTerm;
  marginToDate: LedgerTerm;
  marginToDatePct: number;
  /** True once there is enough data for margin-to-date to mean anything. */
  marginToDateMeaningful: boolean;
  coNetMargin: LedgerTerm;
  pendingCONetAtRisk: LedgerTerm;
  payablesApproved: LedgerTerm;
  payablesPaid: LedgerTerm;
  receivablesPendingAmount: number;
  receivablesPendingCount: number;
  payablesPendingAmount: number;
  payablesPendingCount: number;
  outstanding: LedgerTerm;
}

export function money(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs % 1000 === 0 ? 0 : 1)}K`;
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const isWO = (c: LedgerContract) =>
  c.trade === 'Work Order' || c.trade === 'Work Order Labor';

const base = (c: LedgerContract) => baseContractSum(c);


/** Contract the viewer bills on (they are the `from` party). */
export function findRevenueContract(
  contracts: LedgerContract[],
  myOrgIds: string[],
): LedgerContract | undefined {
  const mine = contracts.filter(
    (c) => c.from_org_id && myOrgIds.includes(c.from_org_id) && c.from_role !== 'Owner' && !isWO(c),
  );
  if (mine.length === 0) return undefined;
  return mine.reduce(
    (best, c) =>
      rank(c) > rank(best) || (rank(c) === rank(best) && base(c) > base(best)) ? c : best,
    mine[0],
  );

}

/**
 * One contract per counterparty pair.
 *
 * Re-inviting a party writes a second `project_contracts` row for the same
 * org pair (usually still `Invited`). Summing every row made a GC's
 * subcontract cost double (e.g. 800K became 1.6M). Keep the live row —
 * Active/Accepted first, then the largest base value.
 */
const STATUS_RANK: Record<string, number> = {
  active: 3,
  accepted: 3,
  invited: 1,
  rejected: 0,
};
const rank = (c: LedgerContract) =>
  STATUS_RANK[(c.status || '').toLowerCase()] ?? 2;

export function dedupeContracts(contracts: LedgerContract[]): LedgerContract[] {
  const byPair = new Map<string, LedgerContract>();
  for (const c of contracts) {
    const key = `${c.from_org_id || c.from_role}|${c.to_org_id || c.to_role}|${c.trade || ''}`;
    const held = byPair.get(key);
    if (
      !held ||
      rank(c) > rank(held) ||
      (rank(c) === rank(held) && base(c) > base(held))
    ) {
      byPair.set(key, c);
    }
  }
  return [...byPair.values()];
}

/** Statuses that are NOT a committed cost yet (awaiting award / declined). */
const UNAWARDED = new Set(['invited', 'pending', 'draft']);
const REJECTED = new Set(['rejected', 'declined', 'void', 'voided']);
export const isAwardedContract = (c: LedgerContract) =>
  !UNAWARDED.has((c.status || '').toLowerCase()) && !REJECTED.has((c.status || '').toLowerCase());

/**
 * Contracts where somebody bills the viewer (subs / crew).
 *
 * Supplier contracts are deliberately excluded: material spend already reaches
 * the ledger through `materialCommitment` (approved estimates + POs), so
 * counting the supplier contract row here double-booked the same dollars.
 * Rejected rows are dropped entirely.
 */
export function findCostContracts(
  contracts: LedgerContract[],
  myOrgIds: string[],
): LedgerContract[] {
  return dedupeContracts(
    contracts.filter(
      (c) =>
        c.to_org_id &&
        myOrgIds.includes(c.to_org_id) &&
        c.from_role !== 'Owner' &&
        c.from_role !== 'Supplier' &&
        !REJECTED.has((c.status || '').toLowerCase()) &&
        !isWO(c),
    ),
  );
}



export function buildProjectLedger(input: LedgerInput): ProjectLedger {
  const {
    role, myOrgIds, contracts, ownerContractValue,
    approvedCORevenue, approvedCOCost, pendingCORevenue, pendingCOCost,
    materialCommitment: matCommitIn, materialsAreMine,
    billed, collected, retainageHeld,
    payablesApproved, payablesPaid,
  } = input;

  const isGC = role === 'General Contractor';
  const revContract = findRevenueContract(contracts, myOrgIds);
  const costContracts = findCostContracts(contracts, myOrgIds);

  // ── Revenue side ────────────────────────────────────────────────────────
  // GC bills the owner, so its revenue instrument is owner_contract_value and
  // never the TC contract (which is a GC *cost*).
  const baseVal = isGC ? Number(ownerContractValue || 0) : revContract ? base(revContract) : 0;
  const baseKnown = isGC ? (ownerContractValue ?? null) !== null && baseVal > 0 : !!revContract;
  const baseContract: LedgerTerm = {
    value: baseVal,
    basis: 'contract',
    known: baseKnown,
    formula: isGC
      ? 'Owner contract value'
      : revContract
        ? `Original signed contract ${money(baseVal)}`
        : 'No contract yet',

  };

  const approvedCOAdds: LedgerTerm = {
    value: approvedCORevenue,
    basis: 'contract',
    known: true,
    formula: 'Σ billable total of approved / completed COs',
  };
  const pendingCOAdds: LedgerTerm = {
    value: pendingCORevenue,
    basis: 'forecast',
    known: true,
    formula: 'Σ billable total of submitted (not yet approved) COs — excluded from revenue',
  };
  const revisedContract: LedgerTerm = {
    value: baseVal + approvedCORevenue,
    basis: 'contract',
    known: baseKnown || approvedCORevenue > 0,
    formula: `${money(baseVal)} base + ${money(approvedCORevenue)} approved COs`,
  };

  // ── Cost side ───────────────────────────────────────────────────────────
  // Only AWARDED contracts are committed cost. An invited-but-unsigned sub is
  // exposure, reported separately so it can never inflate the cost KPI.
  const awardedCostContracts = costContracts.filter(isAwardedContract);
  const pendingAwardContracts = costContracts.filter((c) => !isAwardedContract(c));
  const baseCostVal = awardedCostContracts.reduce((s, c) => s + base(c), 0);
  const baseCost: LedgerTerm = {
    value: baseCostVal,
    basis: 'contract',
    known: awardedCostContracts.length > 0,
    formula: awardedCostContracts.length
      ? `Σ base of ${awardedCostContracts.length} awarded downstream contract${awardedCostContracts.length > 1 ? 's' : ''}`
      : 'No awarded downstream contracts',
  };
  const pendingAwardVal = pendingAwardContracts.reduce((s, c) => s + base(c), 0);
  const pendingAwardCost: LedgerTerm = {
    value: pendingAwardVal,
    basis: 'forecast',
    known: pendingAwardContracts.length > 0,
    formula: pendingAwardContracts.length
      ? `Σ base of ${pendingAwardContracts.length} invited / unsigned contract${pendingAwardContracts.length > 1 ? 's' : ''} — excluded from cost`
      : 'No pending awards',
  };

  const coCost: LedgerTerm = {
    value: approvedCOCost,
    basis: 'contract',
    known: true,
    formula: 'Σ my cost on approved COs (labor + materials I am responsible for)',
  };
  const matCommit = materialsAreMine ? matCommitIn : 0;
  const materialCommitment: LedgerTerm = {
    value: matCommit,
    basis: 'contract',
    known: materialsAreMine,
    formula: materialsAreMine
      ? 'Approved supplier estimates + POs I own (tax incl.)'
      : 'Materials procured by the other party — not my cost',
  };
  const revisedCostVal = baseCostVal + approvedCOCost + matCommit;
  const revisedCost: LedgerTerm = {
    value: revisedCostVal,
    basis: 'contract',
    known: baseCost.known || approvedCOCost > 0 || matCommit > 0,
    formula: `${money(baseCostVal)} subs & crew + ${money(approvedCOCost)} CO cost + ${money(matCommit)} materials`,
  };

  // ── Forecast margin ─────────────────────────────────────────────────────
  const revisedRevenue = revisedContract.value;
  const forecastMarginVal = revisedRevenue - revisedCostVal;
  // A viewer with revenue but no cost side at all (e.g. a field crew, whose own
  // labor burden is not tracked here) would otherwise read "100% margin".
  const hasCostSide = revisedCost.known && revisedCostVal > 0;
  const forecastMargin: LedgerTerm = {
    value: forecastMarginVal,
    basis: 'contract',
    known: revisedContract.known && hasCostSide,
    formula: hasCostSide
      ? `${money(revisedRevenue)} revenue − ${money(revisedCostVal)} cost`
      : 'No cost side tracked on this project — margin not computable',
  };
  const forecastMarginPct = revisedRevenue > 0 ? (forecastMarginVal / revisedRevenue) * 100 : 0;


  // ── Billing / cash ──────────────────────────────────────────────────────
  const billedTerm: LedgerTerm = {
    value: billed,
    basis: 'contract',
    known: true,
    formula: 'Σ pre-tax subtotal of my invoices (excl. draft & voided)',
  };
  const collectedTerm: LedgerTerm = {
    value: collected,
    basis: 'cash',
    known: true,
    formula: 'Σ tax-inclusive total of my PAID invoices',
  };
  const retainageTerm: LedgerTerm = {
    value: retainageHeld,
    basis: 'contract',
    known: true,
    formula: 'Σ retainage withheld on my invoices',
  };
  // Pre-tax billed over pre-tax revised contract — never cash over contract.
  const percentComplete = revisedRevenue > 0 ? Math.min((billed / revisedRevenue) * 100, 100) : 0;
  const outstanding: LedgerTerm = {
    value: revisedRevenue - billed,
    basis: 'contract',
    known: revisedContract.known,
    formula: `${money(revisedRevenue)} revised contract − ${money(billed)} billed`,
  };

  // ── Margin to date (real performance, not a slice of the forecast) ───────
  // Earned revenue = what I have actually billed upstream.
  // Earned cost    = what has actually been billed to me + my own labor burden.
  // Scaling BOTH sides by % complete made this identical to the forecast margin
  // percentage, so the card could never reveal a job going sideways.
  const earnedRevenueVal = billed;
  const earnedCostVal = Number(input.actualCostToDate ?? 0);
  const earnedRevenue: LedgerTerm = {
    value: earnedRevenueVal,
    basis: 'contract',
    known: true,
    formula: 'Σ pre-tax subtotal of my invoices (excl. draft & voided)',
  };
  const earnedCost: LedgerTerm = {
    value: earnedCostVal,
    basis: 'contract',
    known: earnedCostVal > 0,
    formula: 'Invoices billed to me + my own labor cost logged to date',
  };
  const marginToDateVal = earnedRevenueVal - earnedCostVal;
  const marginToDateMeaningful = billed > 0 && earnedCostVal > 0;
  const marginToDate: LedgerTerm = {
    value: marginToDateVal,
    basis: 'contract',
    known: marginToDateMeaningful,
    formula: `${money(earnedRevenueVal)} billed − ${money(earnedCostVal)} cost incurred`,
  };

  const marginToDatePct = earnedRevenueVal > 0 ? (marginToDateVal / earnedRevenueVal) * 100 : 0;

  const coNetMargin: LedgerTerm = {
    value: approvedCORevenue - approvedCOCost,
    basis: 'contract',
    known: true,
    formula: `${money(approvedCORevenue)} approved CO revenue − ${money(approvedCOCost)} approved CO cost`,
  };
  const pendingCONetAtRisk: LedgerTerm = {
    value: pendingCORevenue - pendingCOCost,
    basis: 'forecast',
    known: true,
    formula: `${money(pendingCORevenue)} pending revenue − ${money(pendingCOCost)} pending cost`,
  };

  return {
    role,
    baseContract, approvedCOAdds, pendingCOAdds, revisedContract,
    baseCost, coCost, materialCommitment, revisedCost,
    forecastMargin, forecastMarginPct,
    billed: billedTerm, collected: collectedTerm, retainageHeld: retainageTerm,
    percentComplete,
    earnedRevenue, earnedCost, marginToDate, marginToDatePct, marginToDateMeaningful,
    coNetMargin, pendingCONetAtRisk,
    payablesApproved: {
      value: payablesApproved,
      basis: 'contract',
      known: true,
      formula: 'Σ pre-tax subtotal of invoices billed to me (excl. draft & voided)',
    },
    payablesPaid: {
      value: payablesPaid,
      basis: 'cash',
      known: true,
      formula: 'Σ tax-inclusive total of invoices I have paid',
    },
    receivablesPendingAmount: input.receivablesPendingAmount,
    receivablesPendingCount: input.receivablesPendingCount,
    payablesPendingAmount: input.payablesPendingAmount,
    payablesPendingCount: input.payablesPendingCount,
    outstanding,
  };
}
