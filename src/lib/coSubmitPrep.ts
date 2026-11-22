import { supabase } from '@/integrations/supabase/client';
import { computeFcPricingBase } from '@/lib/fcPricingBase';
import { submittedLaborTotal } from '@/lib/coInvoiceRows';
import { crewPricingEntries, crewUpstreamPricingError } from '@/lib/crewHourReview';


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
    /** grandTotal minus categories the GC procures — what the GC actually owes. */
    billableGrandTotal?: number;
    billableMaterialsTotal?: number;
    billableEquipmentTotal?: number;
    laborTotal?: number;
    materialsTotal?: number;
    equipmentTotal?: number;
    fcTotalHours?: number;
    fcLumpSumTotal?: number;
    approvedFcTotalHours?: number;
    approvedFcLumpSumTotal?: number;
  } | null;
}

/** Re-reads saved rows so stale screen state cannot forward an unpriced order. */
export async function assertCrewUpstreamPricingReady(coId: string, upstreamBillerOrgId: string, requireReviewedCrewEntries = true): Promise<void> {
  const [itemsResult, entriesResult] = await Promise.all([
    supabase.from('co_line_items').select('id').eq('co_id', coId),
    supabase.from('co_labor_entries')
      .select('co_line_item_id, org_id, entered_by_role, is_actual_cost, line_total, crew_review_status')
      .eq('co_id', coId),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (entriesResult.error) throw entriesResult.error;
  const pricingError = crewUpstreamPricingError(itemsResult.data ?? [], entriesResult.data ?? [], upstreamBillerOrgId, requireReviewedCrewEntries);
  if (pricingError) throw new Error(pricingError);
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
    updates.materials_tax = (financials?.billableMaterialsTotal ?? financials?.materialsTotal ?? 0) * rate;
    updates.labor_tax = projTax.labor_taxable ? (financials?.laborTotal ?? 0) * rate : 0;
    updates.equipment_tax = (financials?.billableEquipmentTotal ?? financials?.equipmentTotal ?? 0) * rate;
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
    updates.tc_snapshot_hourly_rate = rate;
    updates.tc_snapshot_markup_percent = markup;
    // Same rule as the on-screen calculation: price from what the crew actually
    // submitted (hours first, lump sum fallback), never from the pricing label.
    updates.tc_submitted_price = computeFcPricingBase({
      fcTotalHours: financials?.approvedFcTotalHours ?? financials?.fcTotalHours ?? 0,
      fcLumpSumTotal: financials?.approvedFcLumpSumTotal ?? financials?.fcLumpSumTotal ?? 0,
      hourlyRate: rate,
      markupPercent: markup,
      pricingType,
    }).calculatedPrice;
    // Materialize the provisional crew-derived price into real billable rows so
    // the frozen snapshot and everything computed from saved rows agree.
    await materializeCrewPricing({
      coId,
      orgId: currentOrgId,
      hourlyRate: rate,
      markupPercent: markup,
      pricingType,
    });
    await assertCrewUpstreamPricingReady(coId, currentOrgId);

    // Saved billable rows already include the crew-derived base and independent
    // subcontractor scope. Sum them once; never freeze only the crew portion.
    const { data: billableRows, error: billableError } = await supabase
      .from('co_labor_entries')
      .select('line_total')
      .eq('co_id', coId)
      .eq('org_id', currentOrgId)
      .eq('entered_by_role', 'TC')
      .eq('is_actual_cost', false);
    if (billableError) throw billableError;
    updates.tc_submitted_price = submittedLaborTotal(billableRows ?? []);

  } else if (isTC) {
    await assertCrewUpstreamPricingReady(coId, currentOrgId, false);

    // Never freeze GC-procured materials/equipment into the price billed to the
    // GC — they pay those directly on their own PO.
    updates.tc_submitted_price = financials?.billableGrandTotal ?? financials?.grandTotal ?? 0;
  }

  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from('change_orders').update(updates).eq('id', coId);
  if (error) throw error;
}

interface MaterializeArgs {
  coId: string;
  orgId: string;
  hourlyRate: number;
  markupPercent: number;
  pricingType?: string | null;
}

/**
 * Turns the provisional "priced from crew time" amount into saved billable rows
 * at submit time.
 *
 * Without this, a subcontractor could submit with `tc_submitted_price` frozen
 * from crew hours while no billable row of their own existed — so every field
 * derived from saved rows (own labor, retainage, net payable, line item card)
 * read $0 while the snapshot read the real number. One scope item at a time,
 * refreshing derived rows when more crew entries are approved and preserving
 * independently entered subcontractor prices.
 */
export async function materializeCrewPricing({
  coId,
  orgId,
  hourlyRate,
  markupPercent,
  pricingType,
}: MaterializeArgs): Promise<void> {
  const { data: rows, error } = await supabase
    .from('co_labor_entries')
    .select('id, co_line_item_id, org_id, entered_by_role, is_actual_cost, pricing_mode, hours, lump_sum, line_total, crew_review_status, crew_pricing_derived, source_fc_entry_ids')
    .eq('co_id', coId);
  if (error) throw error;
  if (!rows) return;

  const today = new Date().toISOString().slice(0, 10);
  const byItem = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.co_line_item_id) continue;
    const list = byItem.get(r.co_line_item_id) ?? [];
    list.push(r);
    byItem.set(r.co_line_item_id, list);
  }

  for (const [lineItemId, itemRows] of byItem) {
    // Never materialize a partial item while another crew entry still needs a
    // decision. The upstream guard will report the pending review clearly.
    if (itemRows.some(r => r.entered_by_role === 'FC' && !r.is_actual_cost && r.crew_review_status === 'pending')) continue;

    const tcBillableRows = itemRows.filter(
      r => !r.is_actual_cost && r.entered_by_role === 'TC' && r.org_id === orgId,
    );
    const derivedBillable = tcBillableRows.find(r => r.crew_pricing_derived);
    const hasManualBillable = tcBillableRows.some(r => !r.crew_pricing_derived);
    if (!derivedBillable && hasManualBillable) continue;

    const crew = crewPricingEntries(itemRows);
    const crewHours = crew.reduce((s, r) => s + Number(r.hours ?? 0), 0);
    const crewLump = crew
      .filter((r) => r.pricing_mode === 'lump_sum')
      .reduce((s, r) => s + Number(r.lump_sum ?? 0), 0);
    const crewCost = crew.reduce((s, r) => s + Number(r.line_total ?? 0), 0);

    const base = computeFcPricingBase({
      fcTotalHours: crewHours,
      fcLumpSumTotal: crewLump,
      hourlyRate,
      markupPercent,
      pricingType,
    });
    const hasPrice = base.fcHasSubmitted && base.calculatedPrice > 0;
    const pricingValues = {
      pricing_mode: base.isHourly ? ('hourly' as const) : ('lump_sum' as const),
      hours: base.isHourly ? crewHours : null,
      base_hourly_rate: base.isHourly ? hourlyRate : null,
      base_lump_sum: base.isHourly ? null : crewLump,
      markup_percent: markupPercent,
      hourly_rate: base.isHourly ? Number((hourlyRate * (1 + markupPercent / 100)).toFixed(2)) : null,
      lump_sum: base.isHourly ? null : base.calculatedPrice,
      description: 'Priced from crew submitted time',
      source_fc_entry_ids: crew.map(r => r.id),
    };

    if (derivedBillable) {
      // Reviewing additional hours must refresh the existing derived row; an
      // old row must never make a partially priced order look complete.
      const { error: updateError } = await supabase.from('co_labor_entries')
        .update(pricingValues)
        .eq('id', derivedBillable.id);
      if (updateError) throw updateError;
    } else if (hasPrice) {
      const { error: insertError } = await supabase.from('co_labor_entries').insert({
        co_id: coId,
        co_line_item_id: lineItemId,
        org_id: orgId,
        entered_by_role: 'TC',
        entry_date: today,
        ...pricingValues,
        is_actual_cost: false,
        crew_pricing_derived: true,
      });
      // Never swallow this: a rejected insert used to leave the frozen price with no
      // saved rows behind it, which reads as "Not priced" and blocks sending upstream.
      if (insertError) throw insertError;
    }

    const derivedInternalCost = itemRows.find(
      r => r.is_actual_cost && r.entered_by_role === 'TC' && r.org_id === orgId && r.crew_pricing_derived,
    );
    const hasManualInternalCost = itemRows.some(
      r => r.is_actual_cost && r.entered_by_role === 'TC' && r.org_id === orgId && !r.crew_pricing_derived,
    );
    if (derivedInternalCost) {
      const { error: costUpdateError } = await supabase.from('co_labor_entries')
        .update({ base_lump_sum: crewCost, lump_sum: crewCost, source_fc_entry_ids: crew.map(r => r.id) })
        .eq('id', derivedInternalCost.id);
      if (costUpdateError) throw costUpdateError;
    } else if (crewCost > 0 && !hasManualInternalCost) {
      const { error: costInsertError } = await supabase.from('co_labor_entries').insert({
        co_id: coId,
        co_line_item_id: lineItemId,
        org_id: orgId,
        entered_by_role: 'TC',
        entry_date: today,
        pricing_mode: 'lump_sum',
        base_lump_sum: crewCost,
        markup_percent: 0,
        lump_sum: crewCost,
        description: 'Internal cost (crew time)',
        is_actual_cost: true,
        crew_pricing_derived: true,
        source_fc_entry_ids: crew.map((r) => r.id),
      });
      if (costInsertError) throw costInsertError;
    }
  }
}

/**
 * Same as `materializeCrewPricing`, but reads the org's own rate / markup first.
 *
 * Used on the approve-and-forward path: a crew-created work order is submitted by
 * the crew (so the subcontractor never presses Submit), yet the subcontractor's
 * crew-derived price still has to become saved billable rows before it travels
 * upstream — otherwise the header total and every per-line amount disagree.
 *
 * Returns how many billable rows this org owns on the CO afterwards, so callers
 * can refuse to forward a priced total with nothing priced behind it.
 */
export async function materializeCrewPricingForOrg({
  coId,
  orgId,
  pricingType,
}: {
  coId: string;
  orgId: string;
  pricingType?: string | null;
}): Promise<number> {
  const { data: settings } = await supabase
    .from('org_settings')
    .select('default_hourly_rate, labor_markup_percent')
    .eq('organization_id', orgId)
    .maybeSingle();

  await materializeCrewPricing({
    coId,
    orgId,
    hourlyRate: settings?.default_hourly_rate ?? 0,
    markupPercent: settings?.labor_markup_percent ?? 0,
    pricingType,
  });

  const { count } = await supabase
    .from('co_labor_entries')
    .select('id', { count: 'exact', head: true })
    .eq('co_id', coId)
    .eq('org_id', orgId)
    .eq('entered_by_role', 'TC')
    .eq('is_actual_cost', false);

  return count ?? 0;
}

