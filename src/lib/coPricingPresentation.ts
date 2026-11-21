import type { COPricingType } from '@/types/changeOrder';

export const CO_PRICING_PRESENTATION: Record<COPricingType, {
  label: string;
  shortLabel: string;
  listLabel: string;
  expectation: string;
}> = {
  fixed: {
    label: 'Fixed price',
    shortLabel: 'Fixed',
    listLabel: 'Fixed price',
    expectation: 'Agreed lump-sum scope. Bill against progress or completed items; internal labor hours and private costs stay with the performing company.',
  },
  tm: {
    label: 'Time & materials',
    shortLabel: 'T&M',
    listLabel: 'T&M',
    expectation: 'Open-ended authorization. The running total grows from dated hours, material and equipment entries; there is no fixed remaining balance.',
  },
  nte: {
    label: 'Not to exceed',
    shortLabel: 'NTE',
    listLabel: 'Not to exceed',
    expectation: 'Log dated hours, materials and equipment against the authorized ceiling. New entries that would pass the ceiling are blocked until an increase is approved.',
  },
};

export function getNteUsedAmount(labor: number, materials: number, equipment: number): number {
  return Math.round((Math.max(0, labor) + Math.max(0, materials) + Math.max(0, equipment)) * 100) / 100;
}

export interface NteEntryStatus {
  projectedUsed: number;
  remainingBeforeEntry: number;
  percentUsed: number;
  exceedsCap: boolean;
  approachingCap: boolean;
}

/** Editing an entry replaces its old amount instead of counting it twice. */
export function getNteEntryStatus(
  usedAmount: number,
  entryAmount: number,
  cap: number | null | undefined,
  replacedEntryAmount = 0,
): NteEntryStatus {
  const safeCap = Math.max(0, Number(cap) || 0);
  const startingUsed = Math.max(0, (Number(usedAmount) || 0) - Math.max(0, Number(replacedEntryAmount) || 0));
  const projectedUsed = Math.round((startingUsed + Math.max(0, Number(entryAmount) || 0)) * 100) / 100;
  const remainingBeforeEntry = Math.round(Math.max(0, safeCap - startingUsed) * 100) / 100;
  const percentUsed = safeCap > 0 ? (projectedUsed / safeCap) * 100 : 0;
  return {
    projectedUsed,
    remainingBeforeEntry,
    percentUsed,
    // Edits that do not raise the entry (lower amounts, date changes) stay allowed even when already over the cap.
    exceedsCap: safeCap > 0 && projectedUsed > safeCap + 0.005
      && (Number(entryAmount) || 0) > Math.max(0, Number(replacedEntryAmount) || 0) + 0.005,
    approachingCap: safeCap > 0 && percentUsed >= 80 && projectedUsed <= safeCap + 0.005,
  };
}

/** Drafts reserve work but are not billed; available actuals exclude both issued and draft invoices. */
export function unbilledActuals(runningTotal: number, billed: number, draft: number): number {
  return Math.round(Math.max(0, runningTotal - Math.max(0, billed) - Math.max(0, draft)) * 100) / 100;
}
