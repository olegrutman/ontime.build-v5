import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ChevronRight, Pencil, X, UserPlus, RotateCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';
import { resendProjectInvite } from '@/lib/inviteUtils';
import type { ProjectFinancials } from '@/hooks/useProjectFinancials';
import type { OrgType } from '@/types/organization';

/* ─── Design tokens (same as GC/FC) ─── */
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
      <div onClick={(e) => e.stopPropagation()} style={{ maxHeight: open ? 1600 : 0, overflow: open ? 'auto' : 'hidden', transition: 'max-height 0.44s cubic-bezier(.22,1,.36,1), opacity 0.3s', opacity: open ? 1 : 0 }}>
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

function EditField({ label, value, onSave, type = 'text' }: {
  label: string; value: string; onSave: (v: string) => void; type?: 'text' | 'number' | 'select' | 'textarea';
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const confirm = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, ...fontLabel }}>
      <span style={{ fontSize: '0.72rem', color: C.muted, fontWeight: 600, minWidth: 130, paddingTop: 4 }}>{label}</span>
      {editing ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1 }}>
          {type === 'textarea' ? (
            <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
              style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.amber}`, fontSize: '0.76rem', resize: 'vertical', minHeight: 48, outline: 'none', ...fontLabel }} />
          ) : type === 'select' ? (
            <select autoFocus value={draft} onChange={(e) => { setDraft(e.target.value); onSave(e.target.value); setEditing(false); }}
              style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.amber}`, fontSize: '0.76rem', outline: 'none', ...fontLabel }}>
              <option>Lump Sum</option><option>T&M</option><option>GMP</option>
            </select>
          ) : (
            <input autoFocus type={type} value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel(); }} onBlur={confirm}
              style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.amber}`, fontSize: '0.76rem', outline: 'none', ...fontLabel }} />
          )}
          {type === 'textarea' && <button onClick={confirm} style={{ padding: '4px 10px', borderRadius: 6, background: C.amber, color: '#fff', fontSize: '0.68rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}>✓</button>}
          <button onClick={cancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2 }}><X size={14} /></button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.ink }}>{value}</span>
          <Pencil size={12} style={{ color: C.faint }} />
        </div>
      )}
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

export function TCProjectOverview({ projectId, projectName = 'Project', financials, onNavigate }: Props) {
  const { userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization?.id;

  // ─── GC Contract (upstream, read-only) ───
  const gcContract = financials.upstreamContract;
  const gcContractVal = gcContract?.contract_sum || 0;
  const gcName = gcContract?.from_org_name || gcContract?.to_org_name || 'General Contractor';

  // ─── FC Contract (downstream, editable) ───
  const fcContract = financials.downstreamContract;
  const fcContractVal = fcContract?.contract_sum || 0;
  const fcName = fcContract?.to_org_name || fcContract?.from_org_name || 'Field Crew';

  // ─── FC Contract editing ───
  const [fcDraft, setFcDraft] = useState({
    crew: fcName,
    value: String(fcContractVal),
    type: 'Lump Sum',
    scope: '',
  });
  const [fcDirty, setFcDirty] = useState(false);

  useEffect(() => {
    setFcDraft(prev => ({ ...prev, crew: fcName, value: String(fcContractVal) }));
  }, [fcName, fcContractVal]);

  const updateFcField = (field: keyof typeof fcDraft, val: string) => {
    setFcDraft(p => ({ ...p, [field]: val }));
    setFcDirty(true);
  };

  const saveFcContract = async () => {
    if (fcContract) {
      const newVal = parseInt(fcDraft.value.replace(/[^0-9]/g, '')) || 0;
      await financials.updateContract(fcContract.id, newVal, fcContract.retainage_percent);
      financials.refetch();
    }
    setFcDirty(false);
  };

  const draftFcVal = parseInt(fcDraft.value.replace(/[^0-9]/g, '')) || 0;

  // ─── Margins ───
  const tcGrossMargin = gcContractVal - draftFcVal;
  const tcMarginPct = gcContractVal > 0 ? ((tcGrossMargin / gcContractVal) * 100).toFixed(1) : '0';

  // ─── Change Orders ───
  const { data: changeOrders = [] } = useQuery({
    queryKey: ['tc-project-cos', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('change_orders')
        .select('id, co_number, title, status, gc_budget, tc_submitted_price, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!projectId,
  });

  const approvedCOs = changeOrders.filter(co => ['approved', 'completed', 'contracted'].includes(co.status));
  const pendingCOs = changeOrders.filter(co => !['approved', 'completed', 'contracted', 'rejected'].includes(co.status));
  const coRevenue = approvedCOs.reduce((s, co) => s + (co.gc_budget || 0), 0);
  const coCost = approvedCOs.reduce((s, co) => s + (co.tc_submitted_price || 0), 0);
  const coNetMargin = coRevenue - coCost;

  // ─── RFIs ───
  const { data: rfis = [] } = useQuery({
    queryKey: ['tc-project-rfis', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_rfis')
        .select('id, rfi_number, subject, status')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!projectId,
  });
  const openRfis = rfis.filter(r => r.status === 'open' || r.status === 'in_review');

  // ─── Invoices ───
  const paidInvoicesUp = financials.recentInvoices.filter(i => i.status === 'PAID');
  const pendingInvoicesUp = financials.recentInvoices.filter(i => i.status === 'SUBMITTED');
  const totalReceivedFromGC = financials.receivablesCollected;
  const totalPendingFromGC = pendingInvoicesUp.reduce((s, i) => s + i.total_amount, 0);

  // FC invoices (payables)
  const totalPaidToFC = financials.payablesPaid;
  const fcPendingAmount = financials.payablesInvoiced - financials.payablesPaid;

  // ─── Totals ───
  const revisedGCTotal = gcContractVal + coRevenue;
  const revisedFCTotal = draftFcVal + coCost;
  const netTCMargin = tcGrossMargin + coNetMargin;
  const gcReceivedPct = revisedGCTotal > 0 ? Math.round((totalReceivedFromGC / revisedGCTotal) * 100) : 0;
  const fcPaidPct = revisedFCTotal > 0 ? Math.round((totalPaidToFC / revisedFCTotal) * 100) : 0;

  // ─── Warnings ───
  const warnings: { color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType; tab: string }[] = [];
  if (totalPendingFromGC > 0) {
    warnings.push({ color: C.yellow, icon: '💰', title: 'Invoice Awaiting GC Approval', sub: `${pendingInvoicesUp.length} invoice${pendingInvoicesUp.length > 1 ? 's' : ''} pending`, value: fmt(totalPendingFromGC), pill: 'Chasing GC', pillType: 'pw', tab: 'invoices' });
  }
  if (fcPendingAmount > 0) {
    warnings.push({ color: C.red, icon: '💰', title: 'FC Invoice Awaiting Your Approval', sub: `${fcName} submitted`, value: fmt(fcPendingAmount), pill: 'You owe FC', pillType: 'pr', tab: 'invoices' });
  }
  if (openRfis.length > 0) {
    warnings.push({ color: C.blue, icon: '❓', title: `${openRfis.length} Open RFI${openRfis.length > 1 ? 's' : ''} Need Response`, sub: 'GC waiting on answers', value: `${openRfis.length} RFIs`, pill: 'Action Needed', pillType: 'pb', tab: 'rfis' });
  }
  if (pendingCOs.length > 0) {
    warnings.push({ color: C.yellow, icon: '📝', title: `${pendingCOs.length} Pending Change Order${pendingCOs.length > 1 ? 's' : ''}`, sub: 'Review and approve', value: `${pendingCOs.length} COs`, pill: 'Review', pillType: 'pw', tab: 'change-orders' });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, ...fontLabel }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: C.ink }}>{projectName}</div>
            <div style={{ fontSize: '0.72rem', color: C.muted }}>Trade Contractor · {userOrgRoles[0]?.organization?.name || 'Your Company'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onNavigate('invoices')} style={{ padding: '8px 16px', borderRadius: 8, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.76rem', border: 'none', cursor: 'pointer', ...fontLabel }}>Submit Invoice to GC</button>
          <button onClick={() => onNavigate('sov')} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.76rem', border: `1px solid ${C.border}`, cursor: 'pointer', ...fontLabel }}>View GC Contract</button>
        </div>
      </div>

      {/* 8 KPI Cards — 4-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} className="max-lg:!grid-cols-2 max-sm:!grid-cols-1">

        {/* Card 1 — GC Contract (read-only) */}
        <KpiCard accent={C.amber} icon="🤝" iconBg={C.amberPale} label="GC CONTRACT (WHAT YOU EARN)" value={gcContractVal > 0 ? fmt(gcContractVal) : '—'} sub={`${gcName} · read-only`} pills={gcContractVal > 0 ? [{ type: 'pa', text: 'Revenue' }, { type: 'pn', text: 'GC set this' }] : [{ type: 'pm', text: 'Not Set' }]} idx={0}>
          <div style={{ padding: '12px 16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Item', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>Contract Value (set by GC)</TdN>, <TdM>{fmt(gcContractVal)}</TdM>]} />
                <TRow cells={[<TdN>Approved COs (billed to GC)</TdN>, <TdM>+{fmt(coRevenue)}</TdM>]} />
                <TRow cells={[<TdN>Revised Total</TdN>, <TdM>{fmt(revisedGCTotal)}</TdM>]} isTotal />
                <TRow cells={[<TdN>Received from GC</TdN>, <TdM>{fmt(totalReceivedFromGC)}</TdM>]} />
                <TRow cells={[<TdN>Pending from GC</TdN>, <TdM>{fmt(totalPendingFromGC)}</TdM>]} />
                <TRow cells={[<TdN>Remaining to Bill</TdN>, <TdM>{fmt(revisedGCTotal - totalReceivedFromGC - totalPendingFromGC)}</TdM>]} isTotal />
              </tbody>
            </table>
            <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: C.blueBg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.72rem', color: C.muted, ...fontLabel }}>
              <span style={{ fontSize: 14 }}>ℹ️</span>
              <span>This contract value was set by your GC. Contact <strong style={{ color: C.ink }}>{gcName}</strong> to request changes.</span>
            </div>
          </div>
        </KpiCard>

        {/* Card 2 — FC Contract (EDITABLE) */}
        <KpiCard accent={C.green} icon="👷" iconBg={C.greenBg} label="FC CONTRACT (YOU SET THIS)" value={draftFcVal > 0 ? fmt(draftFcVal) : '—'} sub={draftFcVal > 0 ? `${fcName} · ${tcMarginPct}% TC margin` : 'No FC contract found'} pills={draftFcVal > 0 ? [{ type: 'pg', text: `${fmt(tcGrossMargin)} margin` }, { type: 'pn', text: `${tcMarginPct}%` }] : [{ type: 'pm', text: 'Not Set' }]} idx={1}>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.faint, marginBottom: 8 }}>FC Contract Terms</div>
            <EditField label="Field Crew" value={fcDraft.crew} onSave={(v) => updateFcField('crew', v)} />
            <EditField label="Contract Value" value={`$${draftFcVal.toLocaleString()}`} onSave={(v) => updateFcField('value', v.replace(/[^0-9]/g, ''))} type="number" />
            <EditField label="Contract Type" value={fcDraft.type} onSave={(v) => updateFcField('type', v)} type="select" />
            <EditField label="Scope Summary" value={fcDraft.scope || 'Click to add scope'} onSave={(v) => updateFcField('scope', v)} type="textarea" />
            {fcDirty && (
              <button onClick={saveFcContract} style={{ width: '100%', padding: '10px', borderRadius: 8, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.78rem', border: 'none', cursor: 'pointer', marginTop: 12, ...fontLabel }}>Save FC Contract</button>
            )}
            {fcDirty && <div style={{ fontSize: '0.6rem', color: C.amber, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, display: 'inline-block' }} />Unsaved changes</div>}

            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.faint, marginTop: 16, marginBottom: 8 }}>Margin Breakdown</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Item', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>GC Contract (your revenue)</TdN>, <TdM>{fmt(gcContractVal)}</TdM>]} />
                <TRow cells={[<TdN>FC Contract (your cost)</TdN>, <TdM>{fmt(draftFcVal)}</TdM>]} />
                <TRow cells={[<TdN>TC Gross Margin</TdN>, <span style={{ ...fontMono, fontSize: '0.78rem', color: C.green }}>{fmt(tcGrossMargin)}</span>]} isTotal />
                <TRow cells={[<TdN>TC Margin %</TdN>, <span style={{ ...fontMono, fontSize: '0.78rem', color: C.green }}>{tcMarginPct}%</span>]} />
                <TRow cells={[<TdN>CO Revenue (from GC)</TdN>, <TdM>+{fmt(coRevenue)}</TdM>]} />
                <TRow cells={[<TdN>CO Cost (to FC)</TdN>, <TdM>+{fmt(coCost)}</TdM>]} />
                <TRow cells={[<TdN>Net TC Margin after COs</TdN>, <span style={{ ...fontMono, fontSize: '0.78rem', color: C.green }}>{fmt(netTCMargin)}</span>]} isTotal />
              </tbody>
            </table>
          </div>
        </KpiCard>

        {/* Card 3 — TC Gross Margin */}
        <KpiCard accent={C.green} icon="📈" iconBg={C.greenBg} label="TC GROSS MARGIN" value={gcContractVal > 0 ? fmt(tcGrossMargin) : '—'} sub={gcContractVal > 0 ? `${tcMarginPct}% · GC contract minus FC contract` : 'Set contracts to see margin'} pills={gcContractVal > 0 ? [{ type: 'pg', text: `${tcMarginPct}%` }] : []} idx={2}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Metric', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>GC Contract</TdN>, <TdM>{fmt(gcContractVal)}</TdM>]} />
                <TRow cells={[<TdN>FC Contract</TdN>, <TdM>{fmt(draftFcVal)}</TdM>]} />
                <TRow cells={[<TdN>Base Margin</TdN>, <TdM>{fmt(tcGrossMargin)}</TdM>]} isTotal />
                <TRow cells={[<TdN>CO Revenue</TdN>, <TdM>+{fmt(coRevenue)}</TdM>]} />
                <TRow cells={[<TdN>CO Cost</TdN>, <TdM>-{fmt(coCost)}</TdM>]} />
                <TRow cells={[<TdN>Net TC Margin</TdN>, <TdM>{fmt(netTCMargin)}</TdM>]} isTotal />
              </tbody>
            </table>
          </div>
        </KpiCard>

        {/* Card 4 — CO Net Margin */}
        <KpiCard accent={C.blue} icon="📋" iconBg={C.blueBg} label="CO NET MARGIN" value={coRevenue > 0 ? `+${fmt(coNetMargin)}` : '0 COs'} sub={coRevenue > 0 ? `Billed ${fmt(coRevenue)} to GC · Paid ${fmt(coCost)} to FC` : 'No approved change orders'} pills={approvedCOs.length > 0 ? [{ type: 'pb', text: `${approvedCOs.length} COs` }] : [{ type: 'pm', text: 'None' }]} idx={3}>
          <div style={{ padding: 12 }}>
            {changeOrders.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['CO #', 'Description', 'Billed to GC', 'Paid to FC', 'TC Net', 'Status']} />
                <tbody>
                  {changeOrders.slice(0, 8).map(co => {
                    const gcB = co.gc_budget || 0;
                    const tcP = co.tc_submitted_price || 0;
                    return (
                      <TRow key={co.id} cells={[
                        <TdN>{co.co_number || '—'}</TdN>,
                        co.title || '—',
                        <TdM>{fmt(gcB)}</TdM>,
                        <TdM>{fmt(tcP)}</TdM>,
                        <span style={{ ...fontMono, fontSize: '0.78rem', color: gcB - tcP >= 0 ? C.green : C.red }}>+{fmt(gcB - tcP)}</span>,
                        <Pill type={['approved', 'completed', 'contracted'].includes(co.status) ? 'pg' : co.status === 'rejected' ? 'pr' : 'pw'}>{co.status}</Pill>,
                      ]} />
                    );
                  })}
                  {approvedCOs.length > 0 && (
                    <TRow cells={[<TdN>{approvedCOs.length} COs</TdN>, '—', <TdM>+{fmt(coRevenue)}</TdM>, <TdM>{fmt(coCost)}</TdM>, <TdM>+{fmt(coNetMargin)}</TdM>, '—']} isTotal />
                  )}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No change orders yet</div>
            )}
            <button onClick={() => onNavigate('change-orders')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Submit CO to GC</button>
          </div>
        </KpiCard>

        {/* Card 5 — Received from GC */}
        <KpiCard accent={C.green} icon="✅" iconBg={C.greenBg} label="RECEIVED FROM GC" value={fmt(totalReceivedFromGC)} sub={`${gcReceivedPct}% of GC contract collected`} pills={[{ type: 'pg', text: `${gcReceivedPct}% received` }]} idx={4}>
          <div style={{ padding: 12 }}>
            {paidInvoicesUp.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['Invoice #', 'Amount', 'Status']} />
                <tbody>
                  {paidInvoicesUp.map(inv => (
                    <TRow key={inv.id} cells={[
                      <TdN>{inv.invoice_number}</TdN>,
                      <TdM>{fmt(inv.total_amount)}</TdM>,
                      <Pill type="pg">Paid</Pill>,
                    ]} />
                  ))}
                  <TRow cells={[<TdN>{paidInvoicesUp.length} paid</TdN>, <TdM>{fmt(totalReceivedFromGC)}</TdM>, '—']} isTotal />
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No payments received yet</div>
            )}
          </div>
        </KpiCard>

        {/* Card 6 — Pending from GC */}
        <KpiCard accent={C.yellow} icon="⏳" iconBg={C.yellowBg} label="PENDING FROM GC" value={totalPendingFromGC > 0 ? fmt(totalPendingFromGC) : '$0'} sub={totalPendingFromGC > 0 ? `${pendingInvoicesUp.length} invoice${pendingInvoicesUp.length > 1 ? 's' : ''} awaiting GC approval` : 'No pending invoices'} pills={totalPendingFromGC > 0 ? [{ type: 'pw', text: 'Chasing GC' }] : [{ type: 'pg', text: 'All clear' }]} idx={5}>
          <div style={{ padding: 12 }}>
            {pendingInvoicesUp.length > 0 ? (
              <>
                {pendingInvoicesUp.map(inv => (
                  <div key={inv.id} style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <TdN>{inv.invoice_number}</TdN>
                      <Pill type="pw">Pending</Pill>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: 4 }}>To: {gcName}</div>
                    <div style={{ fontSize: '1.4rem', color: C.ink, ...fontVal }}>{fmt(inv.total_amount)}</div>
                  </div>
                ))}
                <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: 8, ...fontLabel }}>Awaiting GC approval. You will be notified when approved.</div>
                <button onClick={() => onNavigate('invoices')} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>Send Follow-Up to GC</button>
              </>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No pending invoices</div>
            )}
          </div>
        </KpiCard>

        {/* Card 7 — Paid to FC */}
        <KpiCard accent={C.navy} icon="💸" iconBg={C.surface2} label="PAID TO FC" value={fmt(totalPaidToFC)} sub={`${fcName} · ${fcPaidPct}% of FC contract paid`} pills={[{ type: 'pn', text: `${fcPaidPct}% paid out` }]} idx={6}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Metric', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>FC Contract Value</TdN>, <TdM>{fmt(draftFcVal)}</TdM>]} />
                <TRow cells={[<TdN>Total Paid to FC</TdN>, <TdM>{fmt(totalPaidToFC)}</TdM>]} />
                <TRow cells={[<TdN>Remaining</TdN>, <TdM>{fmt(draftFcVal - totalPaidToFC)}</TdM>]} isTotal />
              </tbody>
            </table>
          </div>
        </KpiCard>

        {/* Card 8 — FC Invoice Pending (You Owe FC) */}
        <KpiCard accent={C.red} icon="⏳" iconBg={C.redBg} label="PENDING — YOU OWE FC" value={fcPendingAmount > 0 ? fmt(fcPendingAmount) : '$0'} sub={fcPendingAmount > 0 ? `${fcName} submitted · awaiting your approval` : 'No pending FC invoices'} pills={fcPendingAmount > 0 ? [{ type: 'pr', text: 'FC waiting on you' }] : [{ type: 'pg', text: 'All clear' }]} idx={7}>
          <div style={{ padding: 12 }}>
            {fcPendingAmount > 0 ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: C.ink, fontSize: '0.82rem' }}>FC Invoice</span>
                    <Pill type="pw">Pending TC Approval</Pill>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: 2 }}>From: {fcName}</div>
                  <div style={{ fontSize: '1.6rem', color: C.ink, ...fontVal }}>{fmt(fcPendingAmount)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button onClick={() => onNavigate('invoices')} style={{ flex: 1, padding: '10px', borderRadius: 8, background: C.green, color: '#fff', fontWeight: 700, fontSize: '0.76rem', border: 'none', cursor: 'pointer', ...fontLabel }}>✓ Approve</button>
                  <button onClick={() => onNavigate('invoices')} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'transparent', color: C.red, fontWeight: 700, fontSize: '0.76rem', border: `1px solid ${C.red}`, cursor: 'pointer', ...fontLabel }}>✗ Reject with Note</button>
                </div>
                <div style={{ fontSize: '0.68rem', color: C.muted, ...fontLabel }}>
                  Note: Approve FC invoice once GC pays you, or approve early based on your cash flow.
                </div>
              </>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No pending FC invoices</div>
            )}
          </div>
        </KpiCard>
      </div>

      {/* Cash Flow Ladder */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '20px 24px', ...fontLabel }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.ink, marginBottom: 16 }}>💧 Cash Flow — {projectName}</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }} className="max-md:flex-col">
          {/* GC Column */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ background: C.navy, color: '#fff', borderRadius: 10, padding: '14px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.7, marginBottom: 4 }}>GC</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: 2 }}>{gcName}</div>
              <div style={{ fontSize: '1.1rem', ...fontVal }}>{fmt(gcContractVal)}</div>
            </div>
            <div style={{ fontSize: '1.2rem', color: C.muted }}>↓</div>
            <div style={{ fontSize: '0.65rem', color: C.faint, marginTop: 2 }}>TC Contract: {fmt(gcContractVal)}</div>
          </div>

          {/* TC Column (You) */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ background: C.amberPale, border: `2px solid ${C.amber}`, borderRadius: 10, padding: '14px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: C.amberD, marginBottom: 4 }}>YOU (TC)</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: C.ink, marginBottom: 2 }}>{userOrgRoles[0]?.organization?.name || 'Your Company'}</div>
              <div style={{ fontSize: '1.1rem', color: C.ink, ...fontVal }}>{fmt(gcContractVal)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: '1.2rem', color: C.muted }}>↓</div>
              <div style={{ background: C.greenBg, border: `1px solid ${C.green}`, borderRadius: 8, padding: '6px 12px' }}>
                <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', color: C.green, fontWeight: 700 }}>TC Margin</div>
                <div style={{ fontSize: '0.88rem', color: C.green, ...fontMono }}>{fmt(netTCMargin)}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.65rem', color: C.faint, marginTop: 4 }}>FC Contract: {fmt(draftFcVal)}</div>
          </div>

          {/* FC Column */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ background: C.navy, color: '#fff', borderRadius: 10, padding: '14px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.7, marginBottom: 4 }}>FC</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: 2 }}>{fcName}</div>
              <div style={{ fontSize: '1.1rem', ...fontVal }}>{fmt(draftFcVal)}</div>
            </div>
            <div style={{ fontSize: '0.65rem', color: C.faint, marginTop: 4 }}>Internal costs managed by FC</div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🚨</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.ink }}>Needs Attention — {projectName}</span>
          </div>
          {warnings.map((w, i) => (
            <WarnItem key={i} color={w.color} icon={w.icon} title={w.title} sub={w.sub} value={w.value} pill={w.pill} pillType={w.pillType} onClick={() => onNavigate(w.tab)} />
          ))}
        </div>
      )}
    </div>
  );
}
