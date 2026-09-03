import { useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { C, fontVal, fontMono, fontLabel, fmt, KpiCard, Pill, BarRow, THead, TdN, TdM, TRow, WarnItem, type PillType } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { useSupplierProjectAnalytics } from '@/hooks/useSupplierProjectAnalytics';
import { SupplierProjectAnalyticsSection } from './SupplierProjectAnalyticsSection';
import { LadderCard } from '@/components/shared/LadderCard';
import { SupplierProjectFunnel } from './supplier/SupplierProjectFunnel';
import { SupplierStatStrip, type StatTile } from './supplier/SupplierStatStrip';
import { isCountedEstimate, isPendingEstimate, isOrderedPO, isBilledInvoice, isReceivedInvoice, poOrderedAmount } from '@/lib/supplierMetrics';


/* ═══════════════════════════════════════════════════ */

interface Props {
  projectId: string;
  projectName?: string;
  financials: ProjectFinancials;
  onNavigate: (tab: string) => void;
}

const PO_STATUS_PILL: Record<string, PillType> = {
  ACTIVE: 'pm', PENDING_APPROVAL: 'pw', SUBMITTED: 'pb', PRICED: 'pa', ORDERED: 'pa', DELIVERED: 'pg',
};

export default function SupplierProjectOverview({ projectId, projectName = 'Project', financials, onNavigate }: Props) {
  const { userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization?.id;

  // Get supplier_id for this org
  const { data: supplierRec } = useQuery({
    queryKey: ['supplier-by-org', currentOrgId],
    queryFn: async () => {
      const { data } = await supabase.from('suppliers').select('id, name').eq('organization_id', currentOrgId!).maybeSingle();
      return data;
    },
    enabled: !!currentOrgId,
  });

  const supplierId = supplierRec?.id;
  const supplierName = supplierRec?.name || 'Supplier';

  // Fetch POs for this project + supplier
  const { data: pos = [] } = useQuery({
    queryKey: ['sup-proj-pos', projectId, supplierId],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchase_orders')
        .select('id, po_number, po_name, status, po_total, po_subtotal_total, sales_tax_percent, source_estimate_id, source_pack_name, created_at')
        .eq('project_id', projectId)
        .eq('supplier_id', supplierId!)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!projectId && !!supplierId,
  });

  // Fetch estimates for this project + supplier org.
  // Canonical "Estimated" counts APPROVED only (see @/lib/supplierMetrics) — we still
  // fetch SUBMITTED so the estimate card can hint at pending submissions.
  const { data: allEstimates = [] } = useQuery({
    queryKey: ['sup-proj-estimates', projectId, currentOrgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('supplier_estimates')
        .select('id, name, total_amount, status')
        .eq('project_id', projectId)
        .eq('supplier_org_id', currentOrgId!)
        .in('status', ['APPROVED', 'SUBMITTED']);
      return data || [];
    },
    enabled: !!projectId && !!currentOrgId,
  });
  const estimates = allEstimates.filter(e => isCountedEstimate(e.status));
  const pendingEstimates = allEstimates.filter(e => isPendingEstimate(e.status));
  const pendingEstimateTotal = pendingEstimates.reduce((sum, estimate) => sum + (estimate.total_amount || 0), 0);


  // Fetch estimate items for pack breakdown
  const estimateIds = estimates.map(e => e.id);
  const { data: estimateItems = [] } = useQuery({
    queryKey: ['sup-proj-est-items', estimateIds],
    queryFn: async () => {
      const { data } = await supabase
        .from('supplier_estimate_items')
        .select('estimate_id, pack_name, line_total')
        .in('estimate_id', estimateIds);
      return data || [];
    },
    enabled: estimateIds.length > 0,
  });

  // Fetch invoices linked to this supplier's POs
  const poIds = pos.map(p => p.id);
  const { data: invoices = [] } = useQuery({
    queryKey: ['sup-proj-invoices', poIds],
    queryFn: async () => {
      if (poIds.length === 0) return [];
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, status, submitted_at, paid_at, po_id, notes')
        .in('po_id', poIds)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: poIds.length > 0,
  });

  // ─── Computed metrics ───
  const totalEstimate = estimates.reduce((s, e) => s + (e.total_amount || 0), 0);

  // Pack breakdown from estimate items
  const packTotals: Record<string, number> = {};
  estimateItems.forEach(item => {
    const pack = item.pack_name || 'Uncategorized';
    packTotals[pack] = (packTotals[pack] || 0) + (item.line_total || 0);
  });
  const packNames = Object.keys(packTotals);

  // Ordered = committed POs, tax-inclusive (canonical)
  const orderedPOs = pos.filter(p => isOrderedPO(p.status));
  const totalOrdered = orderedPOs.reduce((s, p) => s + poOrderedAmount(p), 0);
  const orderedPct = totalEstimate > 0 ? Math.round((totalOrdered / totalEstimate) * 100) : 0;

  // Pack ordered breakdown
  const orderedByPack: Record<string, number> = {};
  orderedPOs.forEach(po => {
    const pack = po.source_pack_name || po.po_name || 'Other';
    orderedByPack[pack] = (orderedByPack[pack] || 0) + poOrderedAmount(po);
  });
  const packByPoId: Record<string, string> = {};
  pos.forEach(po => { packByPoId[po.id] = po.source_pack_name || po.po_name || 'Other'; });


  // Deliveries
  const deliveredPOs = pos.filter(p => p.status === 'DELIVERED');
  const scheduledPOs = pos.filter(p => p.status === 'ORDERED');
  const deliveryCount = deliveredPOs.length + scheduledPOs.length;

  // Invoice metrics (canonical: SUBMITTED/APPROVED/PAID count as billed)
  const nonDraftInvoices = invoices.filter(i => isBilledInvoice(i.status));
  const totalBilled = nonDraftInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const billedPct = totalOrdered > 0 ? Math.round((totalBilled / totalOrdered) * 100) : 0;

  const paidInvoices = invoices.filter(i => isReceivedInvoice(i.status));
  const totalReceived = paidInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const receivedPct = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;

  const pendingInvoices = invoices.filter(i => ['SUBMITTED', 'APPROVED'].includes(i.status));
  const outstanding = totalBilled - totalReceived;
  const futureUnbilled = totalOrdered - totalBilled;

  // Per-pack billed / received (invoices roll up through their PO's pack)
  const billedByPack: Record<string, number> = {};
  nonDraftInvoices.forEach(i => {
    const pack = i.po_id ? packByPoId[i.po_id] : undefined;
    if (!pack) return;
    billedByPack[pack] = (billedByPack[pack] || 0) + (i.total_amount || 0);
  });
  const receivedByPack: Record<string, number> = {};
  paidInvoices.forEach(i => {
    const pack = i.po_id ? packByPoId[i.po_id] : undefined;
    if (!pack) return;
    receivedByPack[pack] = (receivedByPack[pack] || 0) + (i.total_amount || 0);
  });

  const ledgerRows: LedgerRow[] = Array.from(new Set([...packNames, ...Object.keys(orderedByPack)])).map(pack => {
    const est = packTotals[pack] || 0;
    const ord = orderedByPack[pack] || 0;
    const bill = billedByPack[pack] || 0;
    const recd = receivedByPack[pack] || 0;
    const status = recd > 0 && recd >= bill && bill > 0 ? 'Paid'
      : bill > 0 ? 'Invoiced'
      : ord > 0 ? 'Ordered'
      : 'Not ordered';
    const statusColor = status === 'Paid' ? C.green : status === 'Invoiced' ? C.blue : status === 'Ordered' ? C.amberD : C.muted;
    return { key: pack, name: pack, estimated: est, ordered: ord, billed: bill, received: recd, status, statusColor };
  });



  // GC name from financials
  const gcName = financials.upstreamContract?.from_org_name || financials.upstreamContract?.to_org_name || 'General Contractor';

  // Warnings
  const warnings: { color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType; tab: string }[] = [];
  if (scheduledPOs.length > 0) {
    warnings.push({ color: C.yellow, icon: '🚚', title: `${scheduledPOs.length} Deliver${scheduledPOs.length > 1 ? 'ies' : 'y'} Scheduled`, sub: 'Confirm logistics with GC', value: fmt(scheduledPOs.reduce((s, p) => s + (p.po_total || 0), 0)), pill: 'Upcoming', pillType: 'pw', tab: 'purchase-orders' });
  }
  if (outstanding > 0) {
    warnings.push({ color: C.amber, icon: '💰', title: `${fmt(outstanding)} Outstanding Balance`, sub: 'Invoiced but not yet fully paid', value: fmt(outstanding), pill: 'Receivable', pillType: 'pa', tab: 'invoices' });
  }
  const unpricedPOs = pos.filter(p => p.status === 'SUBMITTED');
  if (unpricedPOs.length > 0) {
    warnings.push({ color: C.blue, icon: '📦', title: `${unpricedPOs.length} PO${unpricedPOs.length > 1 ? 's' : ''} Need Pricing`, sub: 'GC submitted — awaiting your pricing', value: fmt(unpricedPOs.reduce((s, p) => s + (p.po_total || 0), 0)), pill: 'Action Needed', pillType: 'pb', tab: 'purchase-orders' });
  }

  // Analytics (Phase A — additive per-project insights)
  const packsOrderedCount = Object.keys(orderedByPack).length;
  const { data: analytics, isLoading: analyticsLoading } = useSupplierProjectAnalytics({
    projectId,
    supplierId,
    supplierOrgId: currentOrgId,
    estimateTotal: totalEstimate,
    orderedTotal: totalOrdered,
    packCount: packNames.length,
    packsOrderedCount,
  });

  // ─── Snapshot inputs ───
  const projectOverBy = Math.max(0, totalOrdered - totalEstimate);
  const packsOverCount = packNames.filter(p => (orderedByPack[p] || 0) > packTotals[p]).length;
  const packOverBy = packNames.reduce((s, p) => s + Math.max(0, (orderedByPack[p] || 0) - packTotals[p]), 0);
  const snapshotOverBy = projectOverBy > 0 ? projectOverBy : packOverBy;

  const lastPaidAt = paidInvoices
    .map(i => i.paid_at)
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  const daysSinceLastPayment = lastPaidAt
    ? Math.floor((Date.now() - new Date(lastPaidAt).getTime()) / 86_400_000)
    : null;

  // ─── Which KPI stages actually have data ───
  const cardHasData = {
    estimate: totalEstimate > 0,
    ordered: totalOrdered > 0,
    deliveries: deliveryCount > 0,
    billed: totalBilled > 0,
    received: totalReceived > 0,
    outstanding: outstanding > 0 || futureUnbilled > 0,
  };

  const emptyTiles: StatTile[] = [
    !cardHasData.estimate && {
      label: 'Estimate value',
      value: 0,
      hint: pendingEstimates.length > 0
        ? `${pendingEstimates.length} pending · ${fmt(pendingEstimateTotal)}`
        : 'No estimate yet',
      tab: 'estimates',
    },
    !cardHasData.ordered && { label: 'Total ordered', value: 0, hint: 'No POs issued', tab: 'purchase-orders' },
    !cardHasData.deliveries && { label: 'Deliveries', value: '0', raw: true, hint: 'None scheduled', tab: 'purchase-orders' },
    !cardHasData.billed && { label: 'Total billed', value: 0, hint: 'No invoices', tab: 'invoices' },
    !cardHasData.received && { label: 'Total received', value: 0, hint: 'No payments', tab: 'invoices' },
    !cardHasData.outstanding && { label: 'Outstanding', value: 0, hint: 'All clear', tab: 'invoices' },
  ].filter(Boolean) as StatTile[];

  const anyCardVisible = Object.values(cardHasData).some(Boolean);

  return (
    <div className="space-y-4">
      {/* Action bar — project name lives in the page hero above */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, ...fontLabel }}>
        <div style={{ fontSize: '0.74rem', color: C.muted, fontWeight: 600 }}>Supplier · {supplierName}</div>
        <div className="flex flex-wrap gap-2">
          {unpricedPOs.length > 0 && (
            <button onClick={() => onNavigate('purchase-orders')} style={{ padding: '8px 16px', borderRadius: 8, background: C.blue, color: '#fff', fontWeight: 700, fontSize: '0.76rem', border: 'none', cursor: 'pointer', ...fontLabel }}>Price {unpricedPOs.length} PO{unpricedPOs.length > 1 ? 's' : ''}</button>
          )}
          {totalOrdered > 0 && (
            <button onClick={() => onNavigate('invoices')} style={{ padding: '8px 16px', borderRadius: 8, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.76rem', border: 'none', cursor: 'pointer', ...fontLabel }}>Submit Invoice</button>
          )}
          <button onClick={() => onNavigate('estimates')} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.76rem', border: `1px solid ${C.border}`, cursor: 'pointer', ...fontLabel }}>Estimates</button>
        </div>
      </div>

      {/* ─── Project snapshot funnel — the one card that tells the whole story ─── */}
      <SupplierProjectFunnel
        projectName={projectName}
        supplierName={supplierName}
        estimate={totalEstimate}
        pendingEstimate={pendingEstimateTotal}
        pendingEstimateCount={pendingEstimates.length}
        ordered={totalOrdered}
        billed={totalBilled}
        received={totalReceived}
        overBy={snapshotOverBy}
        packsOverCount={packsOverCount}
        daysSinceLastPayment={daysSinceLastPayment}
        upcomingDeliveries={scheduledPOs.length}
        onNavigate={onNavigate}
      />

      {/* Action Queue — surfaced above KPIs so suppliers see what's on them first */}
      {warnings.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: '0.78rem', fontWeight: 700, color: C.ink }}>⚡ Action Queue — {projectName}</div>
          {warnings.map((w, i) => (
            <WarnItem key={i} color={w.color} icon={w.icon} title={w.title} sub={w.sub} value={w.value} pill={w.pill} pillType={w.pillType} onClick={() => onNavigate(w.tab)} />
          ))}
        </div>
      )}

      {/* Compact strip for stages with no data yet */}
      <SupplierStatStrip tiles={emptyTiles} onNavigate={onNavigate} />

      {/* KPI cards — only stages that actually have data */}
      {anyCardVisible && (
      <KpiGrid>
        {/* Card 1 — Estimate Value (stacked line items — never scrolls sideways) */}
        {cardHasData.estimate && (
        <KpiCard accent={C.navy} icon="📐" iconBg={C.surface2} label="MATERIAL CONTRACT (APPROVED ESTIMATE)" value={totalEstimate > 0 ? fmt(totalEstimate) : '—'} sub={`Approved estimate = your material contract on ${projectName}`} pills={totalEstimate > 0 ? [{ type: 'pn', text: 'Contract' }] : [{ type: 'pm', text: 'No Estimate' }]} idx={0}>

          <div style={{ padding: 12 }}>
            {packNames.length > 0 ? (
              <div>
                {packNames.map(pack => (
                  <StackedRow
                    key={pack}
                    name={pack}
                    values={[{ k: 'est', v: fmt(packTotals[pack]) }]}
                  />
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontSize: '0.76rem', fontWeight: 800, color: C.ink }}>
                  <span>Total estimate</span><span style={fontMono}>{fmt(totalEstimate)}</span>
                </div>
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>
                {estimates.length > 0 ? `${estimates.length} estimate(s) · ${fmt(totalEstimate)} total` : 'No estimates submitted'}
              </div>
            )}
          </div>
        </KpiCard>
        )}

        {/* Card 2 — Total Ordered (stacked line items with Δ) */}
        {cardHasData.ordered && (
        <KpiCard accent={C.amber} icon="📦" iconBg={C.amberPale} label="TOTAL ORDERED (POs ISSUED)" value={totalOrdered > 0 ? fmt(totalOrdered) : '$0'} sub={totalEstimate > 0 ? `${orderedPct}% of estimate · ${fmt(totalEstimate - totalOrdered)} remaining to order` : `${orderedPOs.length} POs`} pills={orderedPct > 0 ? [{ type: 'pa', text: `${orderedPct}% of est` }] : [{ type: 'pm', text: 'No orders' }]} idx={1}>

          <div style={{ padding: 12 }}>
            {packNames.length > 0 ? (
              <div>
                {packNames.map(pack => {
                  const est = packTotals[pack];
                  const ord = orderedByPack[pack] || 0;
                  const delta = ord - est;
                  return (
                    <StackedRow
                      key={pack}
                      name={pack}
                      values={[
                        { k: 'est', v: fmt(est) },
                        { k: 'ord', v: fmt(ord), color: ord > est ? C.red : C.ink2 },
                        { k: 'Δ', v: ord === 0 ? 'open' : delta === 0 ? 'full' : `${delta > 0 ? '+' : '-'}${fmt(Math.abs(delta))}`, color: delta <= 0 ? C.green : C.red },
                      ]}
                    />
                  );
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontSize: '0.76rem', fontWeight: 800, color: C.ink }}>
                  <span>Total ordered</span><span style={fontMono}>{fmt(totalOrdered)} · {orderedPct}%</span>
                </div>
              </div>
            ) : (
              <div>
                {orderedPOs.map(po => (
                  <StackedRow key={po.id} name={po.po_name || po.po_number || 'PO'} values={[{ k: 'ord', v: fmt(poOrderedAmount(po)) }]} />
                ))}
              </div>
            )}
          </div>
        </KpiCard>
        )}


        {/* Card 3 — Deliveries */}
        {cardHasData.deliveries && (
        <KpiCard accent={C.blue} icon="🚚" iconBg={C.blueBg} label="DELIVERIES (THIS PROJECT)" value={`${deliveryCount}`} sub={`${scheduledPOs.length} scheduled · ${deliveredPOs.length} completed`} pills={scheduledPOs.length > 0 ? [{ type: 'pb', text: `${scheduledPOs.length} pending` }] : deliveredPOs.length > 0 ? [{ type: 'pg', text: 'All delivered' }] : [{ type: 'pm', text: 'None' }]} idx={2}>

          <div style={{ padding: 12 }}>
            {(scheduledPOs.length > 0 || deliveredPOs.length > 0) ? (
              <div>
                {scheduledPOs.map(po => (
                  <div key={po.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.78rem', color: C.ink }}>{po.po_name || po.po_number || 'Delivery'}</div>
                      <div style={{ fontSize: '0.67rem', color: C.muted }}>{po.po_number}</div>
                    </div>
                    <TdM>{fmt(po.po_total || 0)}</TdM>
                    <Pill type="pw">Scheduled</Pill>
                  </div>
                ))}
                {deliveredPOs.map(po => (
                  <div key={po.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.78rem', color: C.ink }}>{po.po_name || po.po_number || 'Delivery'}</div>
                      <div style={{ fontSize: '0.67rem', color: C.muted }}>{po.po_number}</div>
                    </div>
                    <TdM>{fmt(po.po_total || 0)}</TdM>
                    <Pill type="pg">Delivered ✓</Pill>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No deliveries yet</div>
            )}
            <button onClick={() => onNavigate('purchase-orders')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>View All Purchase Orders</button>
          </div>
        </KpiCard>
        )}

        {/* Card 4 — Total Billed */}
        {cardHasData.billed && (
        <KpiCard accent={C.blue} icon="🧾" iconBg={C.blueBg} label="TOTAL BILLED (INVOICED)" value={totalBilled > 0 ? fmt(totalBilled) : '$0'} sub={totalOrdered > 0 ? `${billedPct}% of ordered value invoiced` : 'No orders to invoice against'} pills={billedPct > 0 ? [{ type: 'pb', text: `${billedPct}% billed` }] : [{ type: 'pm', text: 'No invoices' }]} idx={3}>

          <div style={{ padding: 12 }}>
            {nonDraftInvoices.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['Invoice #', 'Amount', 'Status']} />
                <tbody>
                  {nonDraftInvoices.map(inv => (
                    <TRow key={inv.id} cells={[
                      <TdN>{inv.invoice_number}</TdN>,
                      <TdM>{fmt(inv.total_amount)}</TdM>,
                      <Pill type={inv.status === 'PAID' ? 'pg' : inv.status === 'APPROVED' ? 'pb' : 'pw'}>{inv.status}</Pill>,
                    ]} />
                  ))}
                  <TRow cells={[<TdN>{nonDraftInvoices.length} invoices</TdN>, <TdM>{fmt(totalBilled)}</TdM>, '—']} isTotal />
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No invoices submitted</div>
            )}
            <button onClick={() => onNavigate('invoices')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Submit New Invoice</button>
          </div>
        </KpiCard>
        )}

        {/* Card 5 — Total Received */}
        {cardHasData.received && (
        <KpiCard accent={C.green} icon="✅" iconBg={C.greenBg} label="TOTAL RECEIVED" value={fmt(totalReceived)} sub={totalBilled > 0 ? `${receivedPct}% of billed · ${fmt(outstanding)} outstanding` : 'No payments received'} pills={receivedPct > 0 ? [{ type: 'pg', text: `${receivedPct}% collected` }] : [{ type: 'pm', text: 'None' }]} idx={4}>

          <div style={{ padding: 12 }}>
            {paidInvoices.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['Invoice #', 'Billed', 'Received', 'Status']} />
                <tbody>
                  {paidInvoices.map(inv => (
                    <TRow key={inv.id} cells={[
                      <TdN>{inv.invoice_number}</TdN>,
                      <TdM>{fmt(inv.total_amount)}</TdM>,
                      <TdM>{fmt(inv.total_amount)}</TdM>,
                      <Pill type="pg">Paid</Pill>,
                    ]} />
                  ))}
                  <TRow cells={[<TdN>{paidInvoices.length} paid</TdN>, <TdM>{fmt(totalBilled)}</TdM>, <TdM>{fmt(totalReceived)}</TdM>, '—']} isTotal />
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No payments received yet</div>
            )}
          </div>
        </KpiCard>
        )}

        {/* Card 6 — Outstanding Balance */}
        {cardHasData.outstanding && (
        <KpiCard accent={C.yellow} icon="💵" iconBg={C.yellowBg} label="OUTSTANDING BALANCE" value={outstanding > 0 ? fmt(outstanding) : '$0'} sub={futureUnbilled > 0 ? `Plus ${fmt(futureUnbilled)} not yet invoiced` : 'All ordered value invoiced'} pills={outstanding > 0 ? [{ type: 'pw', text: 'Receivable' }] : [{ type: 'pg', text: 'All clear' }]} idx={5}>

          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Item', 'Amount', 'Notes']} />
              <tbody>
                {pendingInvoices.map(inv => (
                  <TRow key={inv.id} cells={[<TdN>{inv.invoice_number} (pending)</TdN>, <TdM>{fmt(inv.total_amount)}</TdM>, `Submitted · awaiting ${gcName}`]} />
                ))}
                {futureUnbilled > 0 && (
                  <TRow cells={[<TdN>Not yet invoiced</TdN>, <TdM>{fmt(futureUnbilled)}</TdM>, 'POs delivered/ordered, not billed']} />
                )}
                <TRow cells={[<TdN>Total Outstanding + Future</TdN>, <TdM>{fmt(outstanding + futureUnbilled)}</TdM>, '—']} isTotal />
              </tbody>
            </table>
          </div>
        </KpiCard>
        )}
      </KpiGrid>
      )}


      {/* Phase A — Per-project supplier analytics */}
      <SupplierProjectAnalyticsSection
        analytics={analytics}
        loading={analyticsLoading}
        estimateTotal={totalEstimate}
        orderedTotal={totalOrdered}
        onNavigate={onNavigate}
      />


      {/* PO Register */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.ink }}>📋 Purchase Orders — {projectName}</div>
          <button onClick={() => onNavigate('purchase-orders')} style={{ fontSize: '0.72rem', fontWeight: 600, color: C.amber, background: 'none', border: 'none', cursor: 'pointer' }}>View All →</button>
        </div>
        {pos.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <THead cols={['PO #', 'Pack / Description', 'Status', 'Amount']} />
            <tbody>
              {pos.slice(0, 10).map(po => (
                <TRow
                  key={po.id}
                  onClick={() => onNavigate(`purchase-orders?po=${po.id}`)}
                  cells={[
                    <TdN>{po.po_number || '—'}</TdN>,
                    po.po_name || po.source_pack_name || '—',
                    <Pill type={PO_STATUS_PILL[po.status] || 'pm'}>{po.status}</Pill>,
                    <TdM>{fmt(po.po_total || 0)}</TdM>,
                  ]}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No purchase orders for this project</div>
        )}
      </div>

      {(() => {
        // Single denominator for every row and segment: the approved estimate
        // (my material contract). Every bar reads "X% of my approved estimate".
        const base = totalEstimate || 0;
        const pctOfBase = (n: number) => (base > 0 ? (n / base) * 100 : 0);
        return (
          <LadderCard
            title={`📊 Material Lifecycle — ${projectName}`}
            totalLabel="% of approved estimate"
            totalValue={fmt(totalEstimate)}
            segments={[
              { pct: pctOfBase(totalReceived), color: C.green },
              { pct: pctOfBase(totalBilled - totalReceived), color: C.blue },
              { pct: pctOfBase(totalOrdered - totalBilled), color: C.amber },
            ]}
            rows={[
              { label: 'Estimated', value: fmt(totalEstimate), pct: base > 0 ? 100 : 0, barColor: C.navy },
              { label: 'Ordered', value: fmt(totalOrdered), pct: pctOfBase(totalOrdered), barColor: C.amber, headline: true },
              { label: 'Billed', value: fmt(totalBilled), pct: pctOfBase(totalBilled), barColor: C.blue },
              { label: 'Received', value: fmt(totalReceived), pct: pctOfBase(totalReceived), barColor: C.green, headline: true },
              ...(outstanding > 0 ? [{ label: 'Outstanding', value: fmt(outstanding), pct: pctOfBase(outstanding), barColor: C.yellow }] : []),
            ]}
          />
        );

      })()}

    </div>
  );
}
