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
  description?: string | null;
};

/** Tax is added to the payable invoice total, not to the approved pre-tax work value. */
export function isTaxInvoiceLine(description: string | null | undefined): boolean {
  return /^\s*(?:sales\s+)?tax(?:\s|\(|$)/i.test(description ?? '');
}

/** One shared status rule: issued invoices bill; drafts reserve entries but are not billed. */
export function applyWoInvoiceLine(info: WoBilledInfo, status: string, line: WoInvoiceLineLike) {
  const normalized = String(status).toUpperCase();
  if (['REJECTED', 'VOID', 'VOIDED'].includes(normalized)) return;
  for (const entryId of line.source_entry_ids ?? []) info.entryIds.add(entryId);
  const amount = isTaxInvoiceLine(line.description) ? 0 : Number(line.current_billed) || 0;
  if (normalized === 'DRAFT') info.draft += amount;
  else info.billed += amount;
}

/** Billed and draft amounts per WO for invoices issued or received by the given org; rejected/void are excluded. */
export async function fetchWoBilledToDate(
  projectId: string,
  orgId: string,
  coIds: string[],
  direction: 'issued' | 'received' = 'issued',
): Promise<Map<string, WoBilledInfo>> {
  const out = new Map<string, WoBilledInfo>();
  coIds.forEach(id => out.set(id, { billed: 0, draft: 0, entryIds: new Set(), legacyFullyBilled: false }));
  if (coIds.length === 0) return out;

  // One authorized read avoids the invoice-line RLS chain that also evaluates
  // unrelated purchase-order policies and previously timed out the selector.
  const { data, error } = await supabase.rpc('get_wo_billing_status', {
    p_project_id: projectId,
    p_org_id: orgId,
    p_co_ids: coIds,
    p_direction: direction,
  });
  if (error) throw error;

  for (const row of data ?? []) {
    out.set(row.co_id, {
      billed: Number(row.billed ?? 0),
      draft: Number(row.draft ?? 0),
      entryIds: new Set(row.entry_ids ?? []),
      legacyFullyBilled: !!row.legacy_fully_billed,
    });
  }
  return out;
}

/** Item reservations use the same issuer-contract scope and status rules as WO totals. */
export async function fetchWoItemBilledToDate(
  projectId: string,
  orgId: string,
  coIds: string[],
  editingInvoiceId?: string,
): Promise<{ itemBilled: Map<string, number>; taggedByCo: Map<string, number> }> {
  const itemBilled = new Map<string, number>();
  const taggedByCo = new Map<string, number>();
  if (coIds.length === 0) return { itemBilled, taggedByCo };

  const { data, error } = await supabase.from('invoice_line_items')
    .select('source_co_id, source_line_item_id, current_billed, description, invoice_id, invoices!inner(status, project_id, project_contracts!inner(from_org_id))')
    .in('source_co_id', coIds)
    .eq('invoices.project_id', projectId)
    .eq('invoices.project_contracts.from_org_id', orgId);
  if (error) throw error;

  for (const line of data ?? []) {
    if (line.invoice_id === editingInvoiceId || !line.source_line_item_id || !line.source_co_id) continue;
    const info: WoBilledInfo = { billed: 0, draft: 0, entryIds: new Set(), legacyFullyBilled: false };
    applyWoInvoiceLine(info, line.invoices.status, line);
    const reserved = info.billed + info.draft;
    itemBilled.set(line.source_line_item_id, (itemBilled.get(line.source_line_item_id) ?? 0) + reserved);
    taggedByCo.set(line.source_co_id, (taggedByCo.get(line.source_co_id) ?? 0) + reserved);
  }
  return { itemBilled, taggedByCo };
}
