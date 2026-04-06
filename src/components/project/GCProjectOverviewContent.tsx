import { useState, type ReactNode } from 'react';
import { ChevronRight, Pencil, X } from 'lucide-react';

/* ─── Design tokens ─── */
const C = {
  amber: '#F5A623', amberD: '#C8850A', amberPale: '#FFF7E6',
  navy: '#0D1F3C',
  bg: '#F0F2F7', surface: '#FFFFFF', surface2: '#F7F9FC',
  border: '#E4E8F0', ink: '#0F1923', ink2: '#253347', muted: '#5A6A7E', faint: '#9AAABB',
  green: '#059669', greenBg: '#ECFDF5',
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
    <div
      onClick={() => setOpen(!open)}
      style={{
        background: C.surface, borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        border: open ? `1.5px solid ${C.amber}` : `1px solid ${C.border}`,
        boxShadow: open ? `0 0 0 3px rgba(245,166,35,.1)` : '0 1px 3px rgba(0,0,0,.04)',
        animationDelay: `${idx * 0.04}s`, ...fontLabel,
      }}
      className="animate-fade-in"
    >
      <div style={{ height: 3, background: accent }} />
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {pills.map((p, i) => <Pill key={i} type={p.type}>{p.text}</Pill>)}
          </div>
        </div>
        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, marginBottom: 2, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '2rem', color: C.ink, lineHeight: 1.1, marginBottom: 2, ...fontVal }}>{value}</div>
        <div style={{ fontSize: '0.67rem', color: C.muted, marginBottom: 10 }}>{sub}</div>
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: C.surface2, fontSize: '0.67rem', color: C.muted, fontWeight: 600, borderTop: `1px solid ${C.border}` }}
        className="hover:bg-[#FFF7E6] transition-colors"
      >
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

function WarnItem({ color, icon, title, sub, value, pill, pillType }: {
  color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderLeft: `3px solid ${color}`, borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.15s', ...fontLabel }} className="hover:translate-x-[2px] hover:bg-[#F7F9FC]">
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

/* ═══════════════════════════════════════════════════ */
/*  GC Project Overview Content (embeddable)          */
/* ═══════════════════════════════════════════════════ */

interface Props {
  projectName?: string;
  ownerBudget?: number;
}

export function GCProjectOverviewContent({ projectName = '5 Cherry Hills Park', ownerBudget = 420000 }: Props) {
  const [contract, setContract] = useState({
    contractor: 'Apex Framing Co.', value: '368000', type: 'Lump Sum',
    signedDate: 'Mar 12, 2025', scope: 'Framing L1–4, all labor and equipment',
  });
  const [dirty, setDirty] = useState(false);

  const updateField = (field: keyof typeof contract, val: string) => {
    setContract((p) => ({ ...p, [field]: val }));
    setDirty(true);
  };
  const saveContract = () => { console.log('save contract', contract); setDirty(false); };

  const contractVal = parseInt(contract.value) || 0;
  const marginDollar = ownerBudget - contractVal;
  const marginPct = contractVal > 0 ? ((marginDollar / ownerBudget) * 100).toFixed(1) : '0';

  const phases = [
    { label: 'Pre-con', done: true }, { label: 'Permits', done: true },
    { label: 'Framing L1', done: true }, { label: 'Framing L2', done: true },
    { label: 'Framing L3', active: true }, { label: 'Framing L4', upcoming: true },
    { label: 'MEP', upcoming: true }, { label: 'Close', upcoming: true },
  ];

  return (
    <div className="space-y-4">
      {/* 8 KPI Cards — 4-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} className="max-lg:!grid-cols-2 max-sm:!grid-cols-1">

        {/* Card 1 — Owner Budget */}
        <KpiCard accent={C.amber} icon="💼" iconBg={C.amberPale} label="OWNER BUDGET" value={fmt(ownerBudget)} sub="Full contract value for this project" pills={[{ type: 'pa', text: 'This Project' }]} idx={0}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Budget Item', 'Value', 'Notes']} />
              <tbody>
                <TRow cells={[<TdN>Owner Contract Value</TdN>, <TdM>$420,000</TdM>, 'Signed contract']} />
                <TRow cells={[<TdN>Approved Change Orders</TdN>, <TdM>+$10,200</TdM>, '3 COs approved']} />
                <TRow cells={[<TdN>Revised Contract Total</TdN>, <TdM>$430,200</TdM>, 'Budget including COs']} />
                <TRow cells={[<TdN>Invoiced to Date</TdN>, <TdM>$168,400</TdM>, '40% of revised total']} isTotal />
                <TRow cells={[<TdN>Remaining</TdN>, <TdM>$261,800</TdM>, '60% remaining']} />
              </tbody>
            </table>
          </div>
        </KpiCard>

        {/* Card 2 — TC Contract (EDITABLE) */}
        <KpiCard accent={C.green} icon="🤝" iconBg={C.greenBg} label="TC CONTRACT (GC SETS THIS)" value={fmt(contractVal)} sub={`${contract.contractor} · ${marginPct}% GC margin`} pills={[{ type: 'pg', text: `${fmt(marginDollar)} margin` }, { type: 'pn', text: `${marginPct}%` }]} idx={1}>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.faint, marginBottom: 8 }}>Contract Terms</div>
            <EditField label="Trade Contractor" value={contract.contractor} onSave={(v) => updateField('contractor', v)} />
            <EditField label="Contract Value" value={`$${parseInt(contract.value).toLocaleString()}`} onSave={(v) => updateField('value', v.replace(/[^0-9]/g, ''))} type="number" />
            <EditField label="Contract Type" value={contract.type} onSave={(v) => updateField('type', v)} type="select" />
            <EditField label="Signed Date" value={contract.signedDate} onSave={(v) => updateField('signedDate', v)} />
            <EditField label="Scope Summary" value={contract.scope} onSave={(v) => updateField('scope', v)} type="textarea" />
            {dirty && (
              <button onClick={saveContract} style={{ width: '100%', padding: '10px', borderRadius: 8, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.78rem', border: 'none', cursor: 'pointer', marginTop: 12, ...fontLabel }}>Save Contract Changes</button>
            )}
            {dirty && <div style={{ fontSize: '0.6rem', color: C.amber, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, display: 'inline-block' }} />Unsaved changes</div>}
            <div style={{ fontSize: '0.58rem', color: C.faint, marginTop: dirty ? 4 : 10 }}>Last updated by Derek Kowalski · today 9:14 AM</div>

            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.faint, marginTop: 16, marginBottom: 8 }}>Margin Breakdown</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Item', 'Value']} />
              <tbody>
                <TRow cells={[<TdN>Owner Budget</TdN>, <TdM>$420,000</TdM>]} />
                <TRow cells={[<TdN>TC Contract</TdN>, <TdM>${contractVal.toLocaleString()}</TdM>]} />
                <TRow cells={[<TdN>GC Gross Margin</TdN>, <TdM>${marginDollar.toLocaleString()}</TdM>]} isTotal />
                <TRow cells={[<TdN>GC Margin %</TdN>, <TdM>{marginPct}%</TdM>]} />
                <TRow cells={[<TdN>CO Impact (billed to owner)</TdN>, <TdM>+$10,200</TdM>]} />
                <TRow cells={[<TdN>CO Cost (passed to TC)</TdN>, <TdM>+$6,200</TdM>]} />
                <TRow cells={[<TdN>Net GC Margin after COs</TdN>, <TdM>$56,000</TdM>]} isTotal />
              </tbody>
            </table>
          </div>
        </KpiCard>

        {/* Card 3 — Change Orders */}
        <KpiCard accent={C.blue} icon="📝" iconBg={C.blueBg} label="CHANGE ORDERS" value="+$10.2K" sub="3 approved · 0 pending" pills={[{ type: 'pb', text: '3 COs' }]} idx={2}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['CO #', 'Description', 'Billed to Owner', 'Passed to TC', 'GC Net', 'Status']} />
              <tbody>
                <TRow cells={[<TdN>CO-006</TdN>, 'Level 2 scope add', <TdM>+$2,200</TdM>, <TdM>+$1,600</TdM>, <TdM>+$600</TdM>, <Pill type="pg">Approved</Pill>]} />
                <TRow cells={[<TdN>CO-007</TdN>, 'Stairwell mod', <TdM>+$1,800</TdM>, <TdM>+$1,200</TdM>, <TdM>+$600</TdM>, <Pill type="pg">Approved</Pill>]} />
                <TRow cells={[<TdN>CO-008</TdN>, 'Level 3 scope', <TdM>+$6,200</TdM>, <TdM>+$4,800</TdM>, <TdM>+$1,400</TdM>, <Pill type="pg">Approved</Pill>]} />
                <TRow cells={[<TdN>3 COs</TdN>, '—', <TdM>+$10,200</TdM>, <TdM>+$7,600</TdM>, <TdM>+$2,600</TdM>, '—']} isTotal />
              </tbody>
            </table>
            <button style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Create New CO</button>
          </div>
        </KpiCard>

        {/* Card 4 — Materials Budget */}
        <KpiCard accent={C.purple} icon="📦" iconBg={C.purpleBg} label="MATERIALS BUDGET" value={fmt(49100)} sub="$66.5K estimated · 74% ordered" pills={[{ type: 'pg', text: '74% of est' }]} idx={3}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Pack', 'Estimated', 'Ordered', 'Variance', 'Status']} />
              <tbody>
                <TRow cells={[<TdN>Lumber Package</TdN>, <TdM>$29,200</TdM>, <TdM>$24,600</TdM>, <TdM>-$4,600</TdM>, <Pill type="pg">under</Pill>]} />
                <TRow cells={[<TdN>Hardware & Fasteners</TdN>, <TdM>$13,300</TdM>, <TdM>$8,400</TdM>, <TdM>-$4,900</TdM>, <Pill type="pg">under</Pill>]} />
                <TRow cells={[<TdN>Sheathing</TdN>, <TdM>$24,000</TdM>, <TdM>$18,200</TdM>, <TdM>-$5,800</TdM>, <Pill type="pg">under</Pill>]} />
                <TRow cells={[<TdN>Returns Credit</TdN>, '—', <TdM>-$2,100</TdM>, '—', <Pill type="pb">credit</Pill>]} />
                <TRow cells={['—', <TdM>$66,500</TdM>, <TdM>$49,100</TdM>, <TdM>-$17,400</TdM>, '—']} isTotal />
              </tbody>
            </table>
            <button style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Create Purchase Order</button>
          </div>
        </KpiCard>

        {/* Card 5 — Open RFIs */}
        <KpiCard accent={C.red} icon="❓" iconBg={C.redBg} label="OPEN RFIs" value="4 Open" sub="8 total · 4 resolved · avg 2.8d" pills={[{ type: 'pr', text: '4 need response' }]} idx={4}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['RFI #', 'Description', 'Submitted', 'Age', 'Action']} />
              <tbody>
                <TRow cells={[<TdN>RFI-021</TdN>, 'Beam pocket detail Bldg A', 'Derek K.', '3d ago', <span style={{ color: C.blue, fontSize: '0.72rem', fontWeight: 600 }}>View →</span>]} />
                <TRow cells={[<TdN>RFI-022</TdN>, 'Anchor bolt layout L3', 'Derek K.', '5d ago', <span style={{ color: C.blue, fontSize: '0.72rem', fontWeight: 600 }}>View →</span>]} />
                <TRow cells={[<TdN>RFI-023</TdN>, 'Header size typ.', 'Mike R.', '2d ago', <span style={{ color: C.blue, fontSize: '0.72rem', fontWeight: 600 }}>View →</span>]} />
                <TRow cells={[<TdN>RFI-024</TdN>, 'Hold-down spec', 'Mike R.', '1d ago', <span style={{ color: C.blue, fontSize: '0.72rem', fontWeight: 600 }}>View →</span>]} />
              </tbody>
            </table>
            <button style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Create RFI</button>
          </div>
        </KpiCard>

        {/* Card 6 — Invoices Paid */}
        <KpiCard accent={C.green} icon="✅" iconBg={C.greenBg} label="INVOICES PAID" value={fmt(150000)} sub="36% of owner contract · 4 paid" pills={[{ type: 'pg', text: 'On track' }]} idx={5}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Invoice #', 'Description', 'Amount', 'Paid Date', 'Status']} />
              <tbody>
                <TRow cells={[<TdN>INV-1024</TdN>, 'Mobilization & layout', <TdM>$47,600</TdM>, 'Jan 15', <Pill type="pg">Paid</Pill>]} />
                <TRow cells={[<TdN>INV-1029</TdN>, 'Level 1 rough framing', <TdM>$42,800</TdM>, 'Feb 8', <Pill type="pg">Paid</Pill>]} />
                <TRow cells={[<TdN>INV-1035</TdN>, 'Foundation framing', <TdM>$28,400</TdM>, 'Mar 2', <Pill type="pg">Paid</Pill>]} />
                <TRow cells={[<TdN>INV-1041</TdN>, 'Materials & install phase 1', <TdM>$31,200</TdM>, 'Mar 28', <Pill type="pg">Paid</Pill>]} />
                <TRow cells={[<TdN>4 invoices</TdN>, '—', <TdM>$150,000</TdM>, '—', '—']} isTotal />
              </tbody>
            </table>
          </div>
        </KpiCard>

        {/* Card 7 — Pending Approval */}
        <KpiCard accent={C.red} icon="⏳" iconBg={C.redBg} label="PENDING YOUR APPROVAL" value={fmt(18400)} sub="1 invoice awaiting sign-off · 4 hr ago" pills={[{ type: 'pr', text: 'Action needed' }]} idx={6}>
          <div style={{ padding: '16px' }}>
            <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, padding: 16, background: C.surface2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, color: C.ink, fontSize: '0.88rem', ...fontVal }}>INV-1048</span>
                <Pill type="pr">Overdue</Pill>
              </div>
              <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: 4 }}>From: <strong style={{ color: C.ink }}>Apex Framing Co.</strong></div>
              <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: 4 }}>Description: Phase 1 labor billing</div>
              <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: 12 }}>Submitted: Today 9:41 AM by Mike R.</div>
              <div style={{ fontSize: '1.6rem', color: C.ink, marginBottom: 16, ...fontVal }}>$18,400</div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '10px', borderRadius: 8, background: C.green, color: '#fff', fontWeight: 700, fontSize: '0.78rem', border: 'none', cursor: 'pointer', ...fontLabel }}>✓ Approve — $18,400</button>
                <button style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'transparent', color: C.red, fontWeight: 700, fontSize: '0.78rem', border: `1px solid ${C.red}`, cursor: 'pointer', ...fontLabel }}>✗ Reject with Note</button>
              </div>
            </div>
          </div>
        </KpiCard>

        {/* Card 8 — Scope Items */}
        <KpiCard accent={C.navy} icon="⚒" iconBg={C.surface2} label="SCOPE ITEMS" value="6 Items" sub="$86.3K total scope · 1 needs review" pills={[{ type: 'pw', text: '1 review needed' }]} idx={7}>
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['CO #', 'Description', 'Assigned To', 'Value', 'Status']} />
              <tbody>
                <TRow cells={[<TdN>CO-041</TdN>, 'Level 1 framing', 'Denver Steel', <TdM>$22,000</TdM>, <Pill type="pg">Complete</Pill>]} />
                <TRow cells={[<TdN>CO-042</TdN>, 'Level 2 framing', 'Denver Steel', <TdM>$18,200</TdM>, <Pill type="pg">Complete</Pill>]} />
                <TRow cells={[<TdN>CO-043</TdN>, 'Level 1 sheathing', 'Denver Steel', <TdM>$8,400</TdM>, <Pill type="pg">Complete</Pill>]} />
                <TRow cells={[<TdN>CO-044</TdN>, 'Level 2 full floor plate', 'Denver Steel', <TdM>$18,200</TdM>, <Pill type="pg">Approved</Pill>]} />
                <TRow cells={[<TdN>CO-045</TdN>, 'Roof sheathing Bldg A', 'Denver Steel', <TdM>$9,800</TdM>, <Pill type="pw">Review — +$1,800</Pill>]} />
                <TRow cells={[<TdN>CO-046</TdN>, 'Level 3 framing start', 'Unassigned', <TdM>$22,100</TdM>, <Pill type="pb">Ready to Assign</Pill>]} />
              </tbody>
            </table>
            <button style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.72rem', border: `1px solid ${C.border}`, cursor: 'pointer', marginTop: 10, ...fontLabel }}>+ Create Change Order</button>
          </div>
        </KpiCard>
      </div>

      {/* Timeline Strip */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '16px 20px', ...fontLabel }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: C.ink, marginBottom: 12 }}>📅 Project Schedule</div>
        <div style={{ display: 'flex', gap: 2 }}>
          {phases.map((p, i) => {
            const bg = p.done ? C.green : p.active ? C.amber : C.border;
            const fg = p.done || p.active ? '#fff' : C.muted;
            return (
              <div key={i} style={{ position: 'relative', flex: 1 }}>
                <div style={{ height: 32, borderRadius: 4, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700, color: fg, letterSpacing: '0.2px' }}>
                  {p.label}
                </div>
                {p.active && <div style={{ position: 'absolute', top: -4, right: '40%', width: 2, height: 40, background: C.amber, borderRadius: 2 }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Warnings */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, color: C.ink, fontSize: '0.88rem' }}>🚨 Needs Attention — {projectName}</div>
        </div>
        <WarnItem color={C.red} icon="💰" title="INV-1048 Awaiting Approval 4+ hrs" sub="Apex Framing · Phase 1 labor" value="$18,400" pill="Overdue" pillType="pr" />
        <WarnItem color={C.yellow} icon="🚚" title="PO-2213 Lumber Delivery Tomorrow" sub="Cascade Lumber · Confirm site receipt" value="$24,600" pill="Tomorrow" pillType="pw" />
        <WarnItem color={C.yellow} icon="⚒" title="CO-045 Budget Variance +$1,800" sub="Roof sheathing Bldg A" value="+$1,800" pill="Review" pillType="pw" />
        <WarnItem color={C.blue} icon="❓" title="4 Open RFIs — Oldest 5 Days" sub="RFI-022 anchor bolt layout blocking L3" value="4 RFIs" pill="Action Needed" pillType="pb" />
        <WarnItem color={C.green} icon="⚒" title="CO-046 Ready to Assign Level 3 Crew" sub="3 crew available · $22,100 scope" value="$22,100" pill="Ready" pillType="pg" />
      </div>
    </div>
  );
}
