import { supabase } from '@/integrations/supabase/client';

export interface WoBilledInfo {
  billed: number;
  /** Draft amounts are visible separately and never count as billed. */
  draft: number;
  /** Includes draft entry IDs as well, preventing a second invoice for the same entry. */
  entryIds: Set<string>;
  /** Billed by an invoice created before progress billing existed (whole WO consumed). */
  legacyFullyBilled: boolean;
}

export type WoInvoiceLineLike = {
  source_co_id: string | null;
  source_entry_ids?: string[] | null;
  current_billed: number | null;
};

/** One shared status rule: issued invoices bill; drafts reserve entries but are not billed. */
export function applyWoInvoiceLine(info: WoBilledInfo, status: string, line: WoInvoiceLineLike) {
  const normalized = String(status).toUpperCase();
  if (['REJECTED', 'VOID', 'VOIDED'].includes(normalized)) return;
  for (const entryId of line.source_entry_ids ?? []) info.entryIds.add(entryId);
  const amount = Number(line.current_billed) || 0;
  if (normalized === 'DRAFT') info.draft += amount;
  else info.billed += amount;
}

/** Billed and draft amounts per WO for invoices the given org issued; rejected/void are excluded. */
export async function fetchWoBilledToDate(projectId: string, orgId: string, coIds: string[]): Promise<Map<string, WoBilledInfo>> {
  const out = new Map<string, WoBilledInfo>();
  coIds.forEach(id => out.set(id, { billed: 0, draft: 0, entryIds: new Set(), legacyFullyBilled: false }));
  if (coIds.length === 0) return out;

  const { data: contracts } = await supabase
    .from('project_contracts').select('id').eq('project_id', projectId).eq('from_org_id', orgId);
  const contractIds = (contracts ?? []).map(c => c.id);
  if (contractIds.length === 0) return out;

  const { data: invoices } = await supabase
    .from('invoices').select('id, status, co_ids').eq('project_id', projectId).in('contract_id', contractIds);
  const tracked = (invoices ?? []).filter(i => !['REJECTED', 'VOID', 'VOIDED'].includes(String(i.status).toUpperCase()));
  if (tracked.length === 0) return out;
  const live = tracked.filter(i => String(i.status).toUpperCase() !== 'DRAFT');
  const statusByInvoice = new Map(tracked.map(i => [i.id, i.status]));

  const { data: lines } = await supabase
    .from('invoice_line_items')
    .select('invoice_id, source_co_id, source_entry_ids, current_billed')
    .in('invoice_id', tracked.map(i => i.id));

  const invoicesWithTaggedLines = new Set<string>();
  for (const l of lines ?? []) {
    if (!l.source_co_id) continue;
    const info = out.get(l.source_co_id);
    if (!info) continue;
    applyWoInvoiceLine(info, statusByInvoice.get(l.invoice_id) ?? 'DRAFT', l);
    if (String(statusByInvoice.get(l.invoice_id)).toUpperCase() !== 'DRAFT') invoicesWithTaggedLines.add(l.invoice_id);
  }
  for (const inv of live) {
    if (invoicesWithTaggedLines.has(inv.id)) continue;
    for (const id of ((inv as any).co_ids ?? []) as string[]) {
      const info = out.get(id);
      if (info) info.legacyFullyBilled = true;
    }
  }
  return out;
}
