import type { WoBilledInfo } from './woProgressBillingData';

export interface EditableWoInvoiceLine {
  source_co_id: string | null;
  source_entry_ids: string[] | null;
  current_billed: number | null;
  billed_percent: number | null;
  description: string | null;
}

export interface EditableWoInvoice {
  id: string;
  invoiceNumber: string;
  contractId: string | null;
  retainagePercent: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  lines: EditableWoInvoiceLine[];
}

type Balance = { grand_total: number; already_billed: number; remaining: number };

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Removes the draft invoice being edited from billed-to-date so its own amounts and
 * entries become available again exactly once; every other invoice still counts.
 */
export function releaseEditedInvoice(
  billed: Map<string, WoBilledInfo>,
  balances: Map<string, Balance>,
  lines: EditableWoInvoiceLine[],
): { billed: Map<string, WoBilledInfo>; balances: Map<string, Balance> } {
  const nextBilled = new Map(billed);
  const nextBalances = new Map(balances);
  const byCo = new Map<string, { amount: number; entries: string[] }>();
  for (const line of lines) {
    if (!line.source_co_id) continue;
    const g = byCo.get(line.source_co_id) ?? { amount: 0, entries: [] };
    g.amount += Number(line.current_billed ?? 0);
    g.entries.push(...(line.source_entry_ids ?? []));
    byCo.set(line.source_co_id, g);
  }
  for (const [coId, g] of byCo) {
    const info = nextBilled.get(coId);
    if (info) {
      const entryIds = new Set(info.entryIds);
      g.entries.forEach(id => entryIds.delete(id));
      nextBilled.set(coId, { ...info, draft: round(Math.max(0, info.draft - g.amount)), entryIds });
    }
    const bal = nextBalances.get(coId);
    if (bal) {
      const already = round(Math.max(0, bal.already_billed - g.amount));
      nextBalances.set(coId, { ...bal, already_billed: already, remaining: round(Math.max(0, bal.grand_total - already)) });
    }
  }
  return { billed: nextBilled, balances: nextBalances };
}
