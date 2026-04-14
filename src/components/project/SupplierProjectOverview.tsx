import { useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { C, fontVal, fontMono, fontLabel, fmt, KpiCard, Pill, BarRow, THead, TdN, TdM, TRow, WarnItem, type PillType } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';

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

  // Fetch estimates for this project + supplier org
  const { data: estimates = [] } = useQuery({
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

  // Ordered = non-ACTIVE POs
  const orderedPOs = pos.filter(p => p.status !== 'ACTIVE');
  const totalOrdered = orderedPOs.reduce((s, p) => s + (p.po_total || 0), 0);
  const orderedPct = totalEstimate > 0 ? Math.round((totalOrdered / totalEstimate) * 100) : 0;

  // Pack ordered breakdown
  const orderedByPack: Record<string, number> = {};
  orderedPOs.forEach(po => {
    const pack = po.source_pack_name || po.po_name || 'Other';
    orderedByPack[pack] = (orderedByPack[pack] || 0) + (po.po_total || 0);
  });

  // Deliveries
  const deliveredPOs = pos.filter(p => p.status === 'DELIVERED');
  const scheduledPOs = pos.filter(p => p.status === 'ORDERED');
  const deliveryCount = deliveredPOs.length + scheduledPOs.length;

  // Invoice metrics
  const nonDraftInvoices = invoices.filter(i => i.status !== 'DRAFT');
  const totalBilled = nonDraftInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const billedPct = totalOrdered > 0 ? Math.round((totalBilled / totalOrdered) * 100) : 0;

  const paidInvoices = invoices.filter(i => i.status === 'PAID');
  const totalReceived = paidInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const receivedPct = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;

  const pendingInvoices = invoices.filter(i => ['SUBMITTED', 'APPROVED'].includes(i.status));
  const outstanding = totalBilled - totalReceived;
  const futureUnbilled = totalOrdered - totalBilled;

  // GC name from financials
  const gcName = financials.upstreamContract?.from_org_name || financials.upstreamContract?.to_org_name || 'General Contractor';

  // Warnings
  const warnings: { color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType; tab: string }[] = [];
  if (scheduledPOs.length > 0) {
    warnings.push({ color: C.yellow, icon: '🚚', title: `${scheduledPOs.length} Delivery${scheduledPOs.length > 1 ? 'ies' : ''} Scheduled`, sub: 'Confirm logistics with GC', value: fmt(scheduledPOs.reduce((s, p) => s + (p.po_total || 0), 0)), pill: 'Upcoming', pillType: 'pw', tab: 'purchase-orders' });
  }
  if (outstanding > 0) {
    warnings.push({ color: C.amber, icon: '💰', title: `${fmt(outstanding)} Outstanding Balance`, sub: 'Invoiced but not yet fully paid', value: fmt(outstanding), pill: 'Receivable', pillType: 'pa', tab: 'invoices' });
  }
  const unpricedPOs = pos.filter(p => p.status === 'SUBMITTED');
  if (unpricedPOs.length > 0) {
    warnings.push({ color: C.blue, icon: '📦', title: `${unpricedPOs.length} PO${unpricedPOs.length > 1 ? 's' : ''} Need Pricing`, sub: 'GC submitted — awaiting your pricing', value: fmt(unpricedPOs.reduce((s, p) => s + (p.po_total || 0), 0)), pill: 'Action Needed', pillType: 'pb', tab: 'purchase-orders' });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, ...fontLabel }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.amber, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: C.ink }}>{projectName}</div>
            <div style={{ fontSize: '0.72rem', color: C.muted }}>Supplier · {supplierName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onNavigate('invoices')} style={{ padding: '8px 16px', borderRadius: 8, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.76rem', border: 'none', cursor: 'pointer', ...fontLabel }}>Submit Invoice</button>
          <button onClick={() => onNavigate('purchase-orders')} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.76rem', border: `1px solid ${C.border}`, cursor: 'pointer', ...fontLabel }}>View All POs</button>
        </div>
      </div>

      {/* 6 KPI Cards — 3-col grid */}
      <KpiGrid>

        {/* Card 1 — Estimate Value */}
        <KpiCard accent={C.navy} icon="📐" iconBg={C.surface2} label="ESTIMATE VALUE (THIS PROJECT)" value={totalEstimate > 0 ? fmt(totalEstimate) : '—'} sub={`Total material estimate for ${projectName}`} pills={totalEstimate > 0 ? [{ type: 'pn', text: 'Estimate' }] : [{ type: 'pm', text: 'No Estimate' }]} idx={0}>
          <div style={{ padding: 12 }}>
            {packNames.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['Pack', 'Estimated', 'Notes']} />
                <tbody>
                  {packNames.map(pack => (
                    <TRow key={pack} cells={[<TdN>{pack}</TdN>, <TdM>{fmt(packTotals[pack])}</TdM>, '—']} />
                  ))}
                  <TRow cells={[<TdN>Total Estimate</TdN>, <TdM>{fmt(totalEstimate)}</TdM>, '—']} isTotal />
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>
                {estimates.length > 0 ? `${estimates.length} estimate(s) · ${fmt(totalEstimate)} total` : 'No estimates submitted'}
              </div>
            )}
          </div>
        </KpiCard>

        {/* Card 2 — Total Ordered */}
        <KpiCard accent={C.amber} icon="📦" iconBg={C.amberPale} label="TOTAL ORDERED (POs ISSUED)" value={totalOrdered > 0 ? fmt(totalOrdered) : '$0'} sub={totalEstimate > 0 ? `${orderedPct}% of estimate · ${fmt(totalEstimate - totalOrdered)} remaining to order` : `${orderedPOs.length} POs`} pills={orderedPct > 0 ? [{ type: 'pa', text: `${orderedPct}% of est` }] : [{ type: 'pm', text: 'No orders' }]} idx={1}>
          <div style={{ padding: 12 }}>
            {packNames.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['Pack', 'Estimated', 'Ordered', 'Δ', 'Usage %']} />
                <tbody>
                  {packNames.map(pack => {
                    const est = packTotals[pack];
                    const ord = orderedByPack[pack] || 0;
                    const delta = ord - est;
                    const usage = est > 0 ? Math.round((ord / est) * 100) : 0;
                    return (
                      <TRow key={pack} cells={[
                        <TdN>{pack}</TdN>,
                        <TdM>{fmt(est)}</TdM>,
                        <TdM>{fmt(ord)}</TdM>,
                        <span style={{ color: delta <= 0 ? C.green : C.red, fontWeight: 600, fontSize: '0.76rem' }}>{delta <= 0 ? '' : '+'}{fmt(Math.abs(delta))}</span>,
                        <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{usage}%</span>,
                      ]} />
                    );
                  })}
                  <TRow cells={[<TdN>Total</TdN>, <TdM>{fmt(totalEstimate)}</TdM>, <TdM>{fmt(totalOrdered)}</TdM>, <span style={{ color: C.green, fontWeight: 600 }}>{fmt(totalEstimate - totalOrdered)}</span>, `${orderedPct}%`]} isTotal />
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 12 }}>
                {orderedPOs.map(po => (
                  <div key={po.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: '0.76rem' }}>
                    <TdN>{po.po_number || po.po_name || 'PO'}</TdN>
                    <TdM>{fmt(po.po_total || 0)}</TdM>
                  </div>
                ))}
              </div>
            )}
          </div>
        </KpiCard>

        {/* Card 3 — Deliveries */}
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

        {/* Card 4 — Total Billed */}
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

        {/* Card 5 — Total Received */}
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

        {/* Card 6 — Outstanding Balance */}
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
      </KpiGrid>

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
                <TRow key={po.id} cells={[
                  <TdN>{po.po_number || '—'}</TdN>,
                  po.po_name || po.source_pack_name || '—',
                  <Pill type={PO_STATUS_PILL[po.status] || 'pm'}>{po.status}</Pill>,
                  <TdM>{fmt(po.po_total || 0)}</TdM>,
                ]} />
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No purchase orders for this project</div>
        )}
      </div>

      {/* Lifecycle Tracker */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '18px 20px', ...fontLabel }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.ink, marginBottom: 16 }}>📊 Material Lifecycle — {projectName}</div>
        <BarRow label="Estimated" value={fmt(totalEstimate)} pct={100} barColor={C.navy} />
        <BarRow label={`Ordered (${orderedPct}%)`} value={fmt(totalOrdered)} pct={totalEstimate > 0 ? (totalOrdered / totalEstimate) * 100 : 0} barColor={C.amber} />
        <BarRow label={`Billed (${billedPct}%)`} value={fmt(totalBilled)} pct={totalOrdered > 0 ? (totalBilled / totalOrdered) * 100 : 0} barColor={C.blue} />
        <BarRow label={`Received (${receivedPct}%)`} value={fmt(totalReceived)} pct={totalBilled > 0 ? (totalReceived / totalBilled) * 100 : 0} barColor={C.green} />
        {outstanding > 0 && <BarRow label="Outstanding" value={fmt(outstanding)} pct={totalBilled > 0 ? (outstanding / totalBilled) * 100 : 0} barColor={C.yellow} />}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: '0.78rem', fontWeight: 700, color: C.ink }}>🚨 Attention — {projectName}</div>
          {warnings.map((w, i) => (
            <WarnItem key={i} color={w.color} icon={w.icon} title={w.title} sub={w.sub} value={w.value} pill={w.pill} pillType={w.pillType} onClick={() => onNavigate(w.tab)} />
          ))}
        </div>
      )}
    </div>
  );
}
