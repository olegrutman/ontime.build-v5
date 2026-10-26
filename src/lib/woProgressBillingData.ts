import { supabase } from '@/integrations/supabase/client';

export interface WoBilledInfo {
  billed: number;
  entryIds: Set<string>;
  /** Billed by an invoice created before progress billing existed (whole WO consumed). */
  legacyFullyBilled: boolean;
}

/** Billed-to-date per WO for invoices the given org issued (rejected invoices excluded). */
export async function fetchWoBilledToDate(projectId: string, orgId: string, coIds: string[]): Promise<Map<string, WoBilledInfo>> {
  const out = new Map<string, WoBilledInfo>();
  coIds.forEach(id => out.set(id, { billed: 0, entryIds: new Set(), legacyFullyBilled: false }));
  if (coIds.length === 0) return out;

  const { data: contracts } = await supabase
    .from('project_contracts').select('id').eq('project_id', projectId).eq('from_org_id', orgId);
  const contractIds = (contracts ?? []).map(c => c.id);
  if (contractIds.length === 0) return out;

  const { data: invoices } = await supabase
    .from('invoices').select('id, status, co_ids').eq('project_id', projectId).in('contract_id', contractIds);
  const live = (invoices ?? []).filter(i => String(i.status).toUpperCase() !== 'REJECTED');
  if (live.length === 0) return out;

  const { data: lines } = await supabase
    .from('invoice_line_items')
    .select('invoice_id, source_co_id, source_entry_id, current_billed')
    .in('invoice_id', live.map(i => i.id));

  const invoicesWithTaggedLines = new Set<string>();
  for (const l of lines ?? []) {
    if (!l.source_co_id) continue;
    invoicesWithTaggedLines.add(l.invoice_id);
    const info = out.get(l.source_co_id);
    if (!info) continue;
    info.billed += Number(l.current_billed) || 0;
    if (l.source_entry_id) info.entryIds.add(l.source_entry_id);
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
