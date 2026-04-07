import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { ProjectFinancials } from '@/hooks/useProjectFinancials';

/* ─── Design tokens (same as FC/TC/GC) ─── */
const C = {
  amber: '#F5A623', amberD: '#C8850A', amberPale: '#FFF7E6',
  navy: '#0D1F3C',
  bg: '#F0F2F7', surface: '#FFFFFF', surface2: '#F7F9FC',
  border: '#E4E8F0', ink: '#0F1923', ink2: '#253347', muted: '#334155', faint: '#64748B',
  green: '#059669', greenBg: '#ECFDF5', greenDark: '#047857',
  red: '#DC2626', redBg: '#FEF2F2',
  blue: '#2563EB', blueBg: '#EFF6FF',
  yellow: '#D97706', yellowBg: '#FFFBEB',
  purple: '#7C3AED', purpleBg: '#F5F3FF',
};

const fontVal = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 } as const;
const fontMono = { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 } as const;
const fontLabel = { fontFamily: "'DM Sans', sans-serif" } as const;

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `$${n.toLocaleString()}`;
}

type PillType = 'pg' | 'pr' | 'pa' | 'pb' | 'pm' | 'pw' | 'pn';
const PILL_S: Record<PillType, { bg: string; color: string; border?: string }> = {
  pg: { bg: C.greenBg, color: C.green },
  pr: { bg: C.redBg, color: C.red },
  pa: { bg: C.amberPale, color: C.amberD },
  pb: { bg: C.blueBg, color: C.blue },
  pm: { bg: C.surface2, color: C.muted, border: `1px solid ${C.border}` },
  pw: { bg: C.yellowBg, color: C.yellow },
  pn: { bg: C.navy, color: '#FFF' },
};

function Pill({ type, children }: { type: PillType; children: ReactNode }) {
  const s = PILL_S[type];
  return (
    <span style={{ fontSize: '0.59rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: s.bg, color: s.color, border: s.border || 'none', whiteSpace: 'nowrap', ...fontLabel }}>
      {children}
    </span>
  );
}

function KpiCard({ accent, icon, iconBg, label, value, sub, pills, children, idx }: {
  accent: string; icon: ReactNode; iconBg: string; label: string; value: string; sub: string;
  pills: { type: PillType; text: string }[]; children: ReactNode; idx: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(!open)} style={{ background: C.surface, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: open ? `1.5px solid ${C.amber}` : `1px solid ${C.border}`, boxShadow: open ? `0 0 0 3px rgba(245,166,35,.1)` : '0 1px 3px rgba(0,0,0,.04)', animationDelay: `${idx * 0.04}s`, ...fontLabel }} className="animate-fade-in">
      <div style={{ height: 3, background: accent }} />
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{pills.map((p, i) => <Pill key={i} type={p.type}>{p.text}</Pill>)}</div>
        </div>
        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, marginBottom: 2, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '2rem', color: C.ink, lineHeight: 1.1, marginBottom: 2, ...fontVal }}>{value}</div>
        <div style={{ fontSize: '0.67rem', color: C.muted, marginBottom: 10 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: C.surface2, fontSize: '0.67rem', color: C.muted, fontWeight: 600, borderTop: `1px solid ${C.border}` }} className="hover:bg-[#FFF7E6] transition-colors">
        <span>{open ? 'Collapse' : 'Expand for detail'}</span>
        <ChevronRight size={13} style={{ transition: 'transform 0.3s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }} />
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ maxHeight: open ? 1200 : 0, overflow: open ? 'auto' : 'hidden', transition: 'max-height 0.44s cubic-bezier(.22,1,.36,1), opacity 0.3s', opacity: open ? 1 : 0 }}>
        {children}
      </div>
    </div>
  );
}

function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
        {cols.map((c, i) => (
          <th key={i} style={{ fontSize: '0.59rem', textTransform: 'uppercase', letterSpacing: '0.9px', color: C.faint, padding: '8px 12px', fontWeight: 600, textAlign: i === cols.length - 1 ? 'right' : 'left', ...fontLabel }}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}

function TdN({ children }: { children: ReactNode }) { return <span style={{ fontWeight: 700, color: C.ink }}>{children}</span>; }
function TdM({ children }: { children: ReactNode }) { return <span style={{ ...fontMono, fontSize: '0.78rem', color: C.ink2 }}>{children}</span>; }

const cellStyle = { padding: '9px 12px', fontSize: '0.76rem', color: C.muted, borderBottom: `1px solid ${C.border}` };
const cellStyleR = { ...cellStyle, textAlign: 'right' as const };
const totalRowStyle = { background: C.surface2, fontWeight: 700 };

function TRow({ cells, isTotal }: { cells: ReactNode[]; isTotal?: boolean }) {
  return (
    <tr style={isTotal ? totalRowStyle : { cursor: 'pointer' }} className={isTotal ? '' : 'hover:bg-[rgba(245,166,35,.05)]'}>
      {cells.map((c, i) => <td key={i} style={i === cells.length - 1 ? cellStyleR : cellStyle}>{c}</td>)}
    </tr>
  );
}

function WarnItem({ color, icon, title, sub, value, pill, pillType, onClick }: {
  color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderLeft: `3px solid ${color}`, borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.15s', ...fontLabel }} className="hover:translate-x-[2px] hover:bg-[#F7F9FC]">
      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: C.ink, fontSize: '0.78rem' }}>{title}</div>
        <div style={{ fontSize: '0.64rem', color: C.muted }}>{sub}</div>
      </div>
      <div style={{ ...fontMono, fontSize: '0.78rem', color: C.ink2, textAlign: 'right', whiteSpace: 'nowrap' }}>{value}</div>
      <Pill type={pillType}>{pill}</Pill>
    </div>
  );
}

function BarRow({ label, value, pct, barColor }: { label: string; value: string; pct: number; barColor: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.72rem', color: C.muted, fontWeight: 600, ...fontLabel }}>{label}</span>
        <span style={{ fontSize: '0.76rem', color: C.ink2, ...fontMono }}>{value}</span>
      </div>
      <div style={{ width: '100%', height: 8, borderRadius: 6, background: C.border, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 6, background: barColor, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }} className="max-lg:!grid-cols-2 max-sm:!grid-cols-1">

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
      </div>

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
