import { supabase } from '@/integrations/supabase/client';

/**
 * Shared submit-preparation helpers for change orders / work orders.
 *
 * Two long-standing gaps this closes:
 *  1. A CO created without a routing target (or accidentally routed to its own
 *     creating org) could never be submitted — every Submit affordance was gated
 *     on `assigned_to_org_id` and no UI existed to set it.
 *  2. Submitting from the "next action" banner skipped the tax / TC price
 *     snapshot that the sidebar Submit button performed, so the upstream party
 *     saw a different number than the submitter.
 */

interface ResolveAssigneeArgs {
  coId: string;
  ownerOrgId: string;
  currentAssignee: string | null | undefined;
  /** Default routing target for the creating org (e.g. the project GC for a TC). */
  fallbackOrgId: string | null | undefined;
}

/**
 * Returns the org the CO should be submitted to, persisting it when it was
 * missing or self-referential. Returns null when no upstream party exists.
 */
export async function resolveCOAssignee({
  coId,
  ownerOrgId,
  currentAssignee,
  fallbackOrgId,
}: ResolveAssigneeArgs): Promise<string | null> {
  if (currentAssignee && currentAssignee !== ownerOrgId) return currentAssignee;

  const next = fallbackOrgId && fallbackOrgId !== ownerOrgId ? fallbackOrgId : null;
  if (!next) return null;

  const { error } = await supabase
    .from('change_orders')
    .update({ assigned_to_org_id: next })
    .eq('id', coId);
  if (error) throw error;
  return next;
}

interface SnapshotArgs {
  coId: string;
  projectId: string;
  isTC: boolean;
  currentOrgId: string;
  useFcPricingBase?: boolean | null;
  pricingType?: string | null;
  financials?: {
    grandTotal?: number;
    laborTotal?: number;
    materialsTotal?: number;
    equipmentTotal?: number;
    fcTotalHours?: number;
    fcLumpSumTotal?: number;
  } | null;
}

/** Freezes project tax settings and (for TCs) the submitted price onto the CO. */
export async function snapshotCOSubmission({
  coId,
  projectId,
  isTC,
  currentOrgId,
  useFcPricingBase,
  pricingType,
  financials,
}: SnapshotArgs): Promise<void> {
  const { data: projTax } = await supabase
    .from('projects')
    .select('sales_tax_rate, labor_taxable')
    .eq('id', projectId)
    .single();

  const updates: Record<string, any> = {};
  if (projTax) {
    const rate = (projTax.sales_tax_rate ?? 0) / 100;
    updates.tax_rate_snapshot = projTax.sales_tax_rate ?? 0;
    updates.labor_taxable_snapshot = projTax.labor_taxable ?? false;
    updates.materials_tax = (financials?.materialsTotal ?? 0) * rate;
    updates.labor_tax = projTax.labor_taxable ? (financials?.laborTotal ?? 0) * rate : 0;
    updates.equipment_tax = (financials?.equipmentTotal ?? 0) * rate;
    updates.total_tax = updates.materials_tax + updates.labor_tax + updates.equipment_tax;
  }

  if (isTC && useFcPricingBase) {
    const { data: settings } = await supabase
      .from('org_settings')
      .select('default_hourly_rate, labor_markup_percent')
      .eq('organization_id', currentOrgId)
      .maybeSingle();
    const rate = settings?.default_hourly_rate ?? 0;
    const markup = settings?.labor_markup_percent ?? 0;
    const isHourly = pricingType === 'tm' || pricingType === 'nte';
    updates.tc_snapshot_hourly_rate = rate;
    updates.tc_snapshot_markup_percent = markup;
    updates.tc_submitted_price = isHourly
      ? (financials?.fcTotalHours ?? 0) * rate
      : (financials?.fcLumpSumTotal ?? 0) * (1 + markup / 100);
  } else if (isTC) {
    updates.tc_submitted_price = financials?.grandTotal ?? 0;
  }

  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from('change_orders').update(updates).eq('id', coId);
  if (error) throw error;
}
