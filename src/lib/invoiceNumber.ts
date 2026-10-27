import { supabase } from '@/integrations/supabase/client';

/** "The Maple House" -> "MAP" */
export function projectCode(name: string | null | undefined): string {
  if (!name) return 'XXX';
  return name.replace(/^(the\s+)/i, '').trim().substring(0, 3).toUpperCase();
}

/** "TC_Test Framing" -> "TC" */
export function orgInitials(name: string | null | undefined): string {
  if (!name) return 'XX';
  return name.replace(/^(the\s+)/i, '').trim().substring(0, 2).toUpperCase();
}

/** Preserve the order's complete identity, including its original CO/WO type. */
export function coTag(coNumber: string | null | undefined): string | null {
  return coNumber?.trim() || null;
}

export function invoiceOrderReference(coNumber: string | null | undefined): string {
  return coTag(coNumber) ?? 'Order';
}

interface Args {
  projectId: string;
  projectName?: string | null;
  fromOrgName?: string | null;
  toOrgName?: string | null;
  /** Single CO/WO being billed — tags the number so it can't be confused with contract billing. */
  coNumber?: string | null;
  /** Multiple CO/WOs on one invoice. */
  multiCoCount?: number;
  isTM?: boolean;
}

/**
 * Canonical invoice number: INV-<PROJ>-<FROM>-<TO>[-<FULL ORDER NUMBER>]-0001
 * CO/WO invoices get their own sequence so they never continue (or collide with)
 * the base contract's progress-billing sequence.
 */
export async function buildInvoiceNumber({
  projectId, projectName, fromOrgName, toOrgName, coNumber, multiCoCount, isTM = false,
}: Args): Promise<string> {
  let name = projectName ?? null;
  if (!name) {
    const { data } = await supabase.from('projects').select('name').eq('id', projectId).maybeSingle();
    name = data?.name ?? null;
  }

  const parts = ['INV', projectCode(name), orgInitials(fromOrgName), orgInitials(toOrgName)];
  const tag = multiCoCount && multiCoCount > 1
    ? `${isTM ? 'WO' : 'CO'}MULTI`
    : coTag(coNumber);
  if (tag) parts.push(tag);
  const prefix = parts.join('-');

  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('project_id', projectId)
    .like('invoice_number', `${prefix.replace(/[\\%_]/g, '\\$&')}-%`);

  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedPrefix}-(\\d+)$`);
  let max = 0;
  (data ?? []).forEach(inv => {
    const m = inv.invoice_number?.match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });

  return `${prefix}-${(max + 1).toString().padStart(4, '0')}`;
}
