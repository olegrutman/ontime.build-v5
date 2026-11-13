import { supabase } from '@/integrations/supabase/client';

/** "The Maple House" -> "MAP" */
export function projectCode(name: string | null | undefined): string {
  if (!name) return 'XXX';
  return name.replace(/^(the\s+)/i, '').replace(/[^a-z0-9]/gi, '').substring(0, 3).toUpperCase();
}

/** "TC_Test Framing" -> "TC" */
export function orgInitials(name: string | null | undefined): string {
  if (!name) return 'XX';
  return name.replace(/^(the\s+)/i, '').replace(/[^a-z0-9]/gi, '').substring(0, 2).toUpperCase();
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
 * Short invoice number (max 8 chars): <PROJ>-001 for contract billing,
 * <PROJ>-W01 for work orders, <PROJ>-C01 for change orders. Each type has its
 * own per-project sequence. The full CO/WO reference stays on invoice lines.
 */
export async function buildInvoiceNumber({
  projectId, projectName, coNumber, multiCoCount, isTM = false,
}: Args): Promise<string> {
  let name = projectName ?? null;
  if (!name) {
    const { data } = await supabase.from('projects').select('name').eq('id', projectId).maybeSingle();
    name = data?.name ?? null;
  }

  const order = coTag(coNumber);
  const isOrder = !!order || (multiCoCount ?? 0) > 1;
  const type = !isOrder ? '' : (order ? (/^WO/i.test(order) ? 'W' : 'C') : (isTM ? 'W' : 'C'));
  const prefix = `${projectCode(name)}-${type}`;

  const { data: sequence, error } = await supabase.rpc('next_invoice_sequence', {
    p_project_id: projectId,
    p_prefix: prefix,
  });
  if (error) throw new Error(`Could not allocate an invoice number: ${error.message}`);
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Could not allocate a valid invoice number');
  }
  // Three project letters, a dash, and at most three digits keep every number <= 8 chars.
  if (sequence > 999) {
    throw new Error(`The ${prefix} invoice sequence is full; contact the project administrator`);
  }

  return `${prefix}${sequence.toString().padStart(type ? 2 : 3, '0')}`;
}
