import { useState, type ReactNode } from 'react';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { ChevronRight, Briefcase, TrendingUp, FileText, Package, HelpCircle, CheckCircle, Clock, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Design tokens (inline style helpers) ─── */
const COLORS = {
  amber: '#F5A623', amberD: '#C8850A', amberPale: '#FFF7E6',
  navy: '#0D1F3C', navyL: '#162E52',
  bg: '#F0F2F7', surface: '#FFFFFF', surface2: '#F7F9FC',
  border: '#E4E8F0', ink: '#0F1923', ink2: '#253347', muted: '#5A6A7E', faint: '#9AAABB',
  green: '#059669', greenBg: '#ECFDF5',
  red: '#DC2626', redBg: '#FEF2F2',
  blue: '#2563EB', blueBg: '#EFF6FF',
  yellow: '#D97706', yellowBg: '#FFFBEB',
  purple: '#7C3AED', purpleBg: '#F5F3FF',
};

const fontVal = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 };
const fontMono = { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 };
const fontLabel = { fontFamily: "'DM Sans', sans-serif" };

/* ─── Helpers ─── */
function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `$${n.toLocaleString()}`;
}

/* ─── Status Pill ─── */
type PillType = 'pg' | 'pr' | 'pa' | 'pb' | 'pm' | 'pw';
const PILL_STYLES: Record<PillType, { bg: string; color: string; border?: string }> = {
  pg: { bg: COLORS.greenBg, color: COLORS.green },
  pr: { bg: COLORS.redBg, color: COLORS.red },
  pa: { bg: COLORS.amberPale, color: COLORS.amberD },
  pb: { bg: COLORS.blueBg, color: COLORS.blue },
  pm: { bg: COLORS.surface2, color: COLORS.muted, border: `1px solid ${COLORS.border}` },
  pw: { bg: COLORS.yellowBg, color: COLORS.yellow },
};

function Pill({ type, children }: { type: PillType; children: ReactNode }) {
  const s = PILL_STYLES[type];
  return (
    <span
      style={{
        fontSize: '0.59rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10,
        background: s.bg, color: s.color, border: s.border || 'none',
        whiteSpace: 'nowrap', ...fontLabel,
      }}
    >
      {children}
    </span>
  );
}

/* ─── Progress Bar ─── */
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: COLORS.border, borderRadius: 4, width: 80, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4 }} />
    </div>
  );
}

/* ─── KPI Card ─── */
interface KpiCardProps {
  accent: string;
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
  pills: { type: PillType; text: string }[];
  children: ReactNode;
  idx: number;
}

function KpiCard({ accent, icon, iconBg, label, value, sub, pills, children, idx }: KpiCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        background: COLORS.surface, borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        border: open ? `1.5px solid ${COLORS.amber}` : `1px solid ${COLORS.border}`,
        boxShadow: open ? `0 0 0 3px rgba(245,166,35,.1)` : '0 1px 3px rgba(0,0,0,.04)',
        animationDelay: `${idx * 0.04}s`,
        ...fontLabel,
      }}
      className="animate-fade-in"
    >
      {/* Accent bar */}
      <div style={{ height: 3, background: accent }} />

      {/* Header */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            {icon}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {pills.map((p, i) => <Pill key={i} type={p.type}>{p.text}</Pill>)}
          </div>
        </div>

        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: COLORS.faint, marginBottom: 2, fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ fontSize: '2rem', color: COLORS.ink, lineHeight: 1.1, marginBottom: 2, ...fontVal }}>
          {value}
        </div>
        <div style={{ fontSize: '0.67rem', color: COLORS.muted, marginBottom: 10 }}>
          {sub}
        </div>
      </div>

      {/* Footer strip */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', background: COLORS.surface2, fontSize: '0.67rem',
          color: COLORS.muted, fontWeight: 600, borderTop: `1px solid ${COLORS.border}`,
        }}
        className="hover:bg-[#FFF7E6] transition-colors"
      >
        <span>{open ? 'Collapse' : 'Expand for detail'}</span>
        <ChevronRight
          size={13}
          style={{ transition: 'transform 0.3s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </div>

      {/* Expand body */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: open ? 700 : 0,
          overflow: open ? 'auto' : 'hidden',
          transition: 'max-height 0.44s cubic-bezier(.22,1,.36,1), opacity 0.3s',
          opacity: open ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Inner Table helpers ─── */
function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background: COLORS.surface2, borderBottom: `1px solid ${COLORS.border}` }}>
        {cols.map((c, i) => (
          <th
            key={i}
            style={{
              fontSize: '0.59rem', textTransform: 'uppercase', letterSpacing: '0.9px',
              color: COLORS.faint, padding: '8px 12px', fontWeight: 600,
              textAlign: i === cols.length - 1 ? 'right' : 'left', ...fontLabel,
            }}
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TdN({ children }: { children: ReactNode }) {
  return <span style={{ fontWeight: 700, color: COLORS.ink }}>{children}</span>;
}
function TdM({ children }: { children: ReactNode }) {
  return <span style={{ ...fontMono, fontSize: '0.78rem', color: COLORS.ink2 }}>{children}</span>;
}
function TdS({ children }: { children: ReactNode }) {
  return <span style={{ display: 'block', fontSize: '0.64rem', color: COLORS.faint, marginTop: 1 }}>{children}</span>;
}

const cellStyle = { padding: '9px 12px', fontSize: '0.76rem', color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` };
const cellStyleR = { ...cellStyle, textAlign: 'right' as const };
const totalRowStyle = { background: COLORS.surface2, fontWeight: 700 };

function TableRow({ cells, isTotal, onClick }: { cells: ReactNode[]; isTotal?: boolean; onClick?: () => void }) {
  return (
    <tr
      style={isTotal ? totalRowStyle : { cursor: 'pointer' }}
      className={isTotal ? '' : 'hover:bg-[rgba(245,166,35,.05)]'}
      onClick={onClick}
    >
      {cells.map((c, i) => (
        <td key={i} style={i === cells.length - 1 ? cellStyleR : cellStyle}>{c}</td>
      ))}
    </tr>
  );
}

/* ─── Data ─── */
const PROJECTS = [
  { name: '5 Cherry Hills Park', phase: 'Framing L2-4', budget: 420000, progress: 64, barColor: COLORS.amber, tcContract: 368000, invoiced: 150000, cos: 3, coVal: 10200, rfisOpen: 4, rfisClosed: 4 },
  { name: 'Tower 14 — Phase 2', phase: 'Structural L6-9', budget: 680000, progress: 38, barColor: COLORS.blue, tcContract: 595000, invoiced: 210000, cos: 5, coVal: 22000, rfisOpen: 7, rfisClosed: 5 },
  { name: 'Mesa Logistics Hub', phase: 'MEP Rough-in', budget: 290000, progress: 88, barColor: COLORS.green, tcContract: 248000, invoiced: 260000, cos: 2, coVal: 4200, rfisOpen: 1, rfisClosed: 4 },
  { name: 'Apex Retail Center', phase: 'Pre-construction', budget: 520000, progress: 12, barColor: COLORS.yellow, tcContract: 0, invoiced: 0, cos: 0, coVal: 0, rfisOpen: 2, rfisClosed: 0 },
  { name: 'Hyatt Studios DEN', phase: 'EIFS L2-4', budget: 740000, progress: 55, barColor: COLORS.purple, tcContract: 650000, invoiced: 180000, cos: 4, coVal: 18600, rfisOpen: 5, rfisClosed: 4 },
];

const totalBudget = PROJECTS.reduce((s, p) => s + p.budget, 0);
const totalTC = PROJECTS.reduce((s, p) => s + p.tcContract, 0);
const totalMargin = totalBudget - totalTC;
const totalCOs = PROJECTS.reduce((s, p) => s + p.cos, 0);
const totalCOVal = PROJECTS.reduce((s, p) => s + p.coVal, 0);
const totalInvoiced = PROJECTS.reduce((s, p) => s + p.invoiced, 0);
const totalRfisOpen = PROJECTS.reduce((s, p) => s + p.rfisOpen, 0);
const totalRfisClosed = PROJECTS.reduce((s, p) => s + p.rfisClosed, 0);

/* ─── Card expand bodies ─── */
function Card1Body() {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <THead cols={['Project', 'Phase', 'Owner Budget', 'Progress']} />
      <tbody>
        {PROJECTS.map((p) => (
          <TableRow key={p.name} onClick={() => console.log(`navigate → ${p.name} overview`)} cells={[
            <TdN>{p.name}</TdN>,
            <>{p.phase}</>,
            <TdM>{fmt(p.budget)}</TdM>,
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bar pct={p.progress} color={p.barColor} /><span style={{ fontSize: '0.7rem' }}>{p.progress}%</span></div>,
          ]} />
        ))}
        <TableRow isTotal cells={['', '', <TdM>{fmt(totalBudget)}</TdM>, '']} />
      </tbody>
    </table>
  );
}

function Card2Body() {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <THead cols={['Project', 'Owner Budget', 'Trade Contractor Contract', 'General Contractor Margin', 'Margin %']} />
      <tbody>
        {PROJECTS.map((p) => {
          const margin = p.tcContract > 0 ? p.budget - p.tcContract : 0;
          const pct = p.tcContract > 0 ? Math.round((margin / p.budget) * 100) : 0;
          return (
            <TableRow key={p.name} onClick={() => console.log(`navigate → ${p.name} financials`)} cells={[
              <TdN>{p.name.split(' ').slice(0, 2).join(' ')}</TdN>,
              <TdM>{fmt(p.budget)}</TdM>,
              <TdM>{p.tcContract > 0 ? fmt(p.tcContract) : '—'}</TdM>,
              <TdM>{margin > 0 ? fmt(margin) : p.tcContract === 0 ? '—' : fmt(margin)}</TdM>,
              <>{p.tcContract > 0 ? `${pct}%` : 'Setup'}</>,
            ]} />
          );
        })}
        <TableRow isTotal cells={['', <TdM>{fmt(totalBudget)}</TdM>, <TdM>{fmt(totalTC)}</TdM>, <TdM>{fmt(totalMargin)}</TdM>, '30%']} />
      </tbody>
    </table>
  );
}

function Card3Body() {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <THead cols={['Project', '# COs', 'CO Value', 'CO % of Contract']} />
      <tbody>
        {PROJECTS.map((p) => {
          const coPct = p.tcContract > 0 ? ((p.coVal / p.tcContract) * 100).toFixed(1) : '—';
          return (
            <TableRow key={p.name} onClick={() => console.log(`navigate → ${p.name} change-orders`)} cells={[
              <TdN>{p.name.split(' ').slice(0, 2).join(' ')}</TdN>,
              <>{p.cos || '—'}</>,
              <TdM>{p.coVal > 0 ? `+${fmt(p.coVal)}` : '—'}</TdM>,
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.coVal > 0 && <Bar pct={Number(coPct) * 10} color={COLORS.green} />}
                <span>{typeof coPct === 'string' ? coPct : `${coPct}%`}</span>
              </div>,
            ]} />
          );
        })}
        <TableRow isTotal cells={['', totalCOs.toString(), <TdM>+{fmt(totalCOVal)}</TdM>, 'avg 2.8%']} />
      </tbody>
    </table>
  );
}

function Card4Body() {
  const sections = [
    {
      title: '5 Cherry Hills Park', est: 66500, ordered: 49100,
      items: [
        { name: 'Lumber Package', est: 29200, ordered: 24600, status: 'pg' as PillType, label: 'under' },
        { name: 'Hardware & Fasteners', est: 13300, ordered: 8400, status: 'pg' as PillType, label: 'under' },
        { name: 'Sheathing', est: 24000, ordered: 18200, status: 'pg' as PillType, label: 'under' },
        { name: 'Returns Credit', est: 0, ordered: -2100, status: 'pb' as PillType, label: 'credit' },
      ],
    },
    {
      title: 'Tower 14 — Phase 2', est: 143000, ordered: 143200,
      items: [
        { name: 'Structural Steel', est: 85000, ordered: 91000, status: 'pr' as PillType, label: 'over' },
        { name: 'Concrete Forms', est: 28000, ordered: 28400, status: 'pw' as PillType, label: 'watch' },
        { name: 'Hardware & Anchors', est: 18000, ordered: 14000, status: 'pg' as PillType, label: 'under' },
        { name: 'Misc Metals', est: 12000, ordered: 9800, status: 'pg' as PillType, label: 'under' },
      ],
    },
  ];

  return (
    <div>
      {sections.map((sec) => (
        <div key={sec.title}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.surface2, padding: '8px 12px', borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontWeight: 700, color: COLORS.ink, fontSize: '0.76rem' }}>{sec.title}</span>
            <span style={{ fontSize: '0.64rem', color: COLORS.faint }}>Est: {fmt(sec.est)} · Ordered: {fmt(sec.ordered)}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <THead cols={['Pack', 'Estimated', 'Ordered', 'Variance', 'Status']} />
            <tbody>
              {sec.items.map((it) => {
                const variance = it.ordered - it.est;
                return (
                  <TableRow key={it.name} cells={[
                    <TdN>{it.name}</TdN>,
                    <TdM>{it.est > 0 ? fmt(it.est) : '—'}</TdM>,
                    <TdM>{fmt(it.ordered)}</TdM>,
                    <TdM>{variance >= 0 ? `+${fmt(variance)}` : `-${fmt(Math.abs(variance))}`}</TdM>,
                    <Pill type={it.status}>{it.label}</Pill>,
                  ]} />
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

const RFI_DATA = [
  {
    project: 'Cherry Hills', open: 4, closed: 4,
    rfis: [
      { id: 'RFI-021', desc: 'Beam pocket detail Bldg A', age: '3d ago' },
      { id: 'RFI-022', desc: 'Anchor bolt layout L3', age: '5d ago' },
      { id: 'RFI-023', desc: 'Header size typ.', age: '2d ago' },
      { id: 'RFI-024', desc: 'Hold-down spec', age: '1d ago' },
    ],
  },
  {
    project: 'Tower 14', open: 7, closed: 5,
    rfis: [
      { id: 'RFI-T14-031', desc: 'Embed plate detail', age: '1d ago' },
      { id: 'RFI-T14-032', desc: 'Column splice elevation', age: '4d ago' },
      { id: 'RFI-T14-033', desc: 'Lateral load path', age: '6d ago' },
    ],
    more: 4,
  },
  {
    project: 'Mesa Logistics', open: 1, closed: 4,
    rfis: [{ id: 'RFI-MLH-011', desc: 'Duct routing conflict', age: '2d ago' }],
  },
  {
    project: 'Apex Retail', open: 2, closed: 0,
    rfis: [
      { id: 'RFI-ARC-001', desc: 'Site plan confirmation', age: '5d ago' },
      { id: 'RFI-ARC-002', desc: 'Geotech review', age: '3d ago' },
    ],
  },
  {
    project: 'Hyatt Studios', open: 5, closed: 4,
    rfis: [
      { id: 'RFI-HSD-041', desc: 'EIFS anchor pattern', age: '1d ago' },
      { id: 'RFI-HSD-042', desc: 'Window sill flashing', age: '3d ago' },
      { id: 'RFI-HSD-043', desc: 'Expansion joint layout', age: '5d ago' },
    ],
    more: 2,
  },
];

function Card5Body() {
  return (
    <div>
      {RFI_DATA.map((sec) => (
        <div key={sec.project}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.surface2, padding: '8px 12px', borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontWeight: 700, color: COLORS.ink, fontSize: '0.76rem' }}>{sec.project}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <Pill type="pr">{sec.open} Open</Pill>
              {sec.closed > 0 && <Pill type="pm">{sec.closed} Closed</Pill>}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <THead cols={['RFI ID', 'Description', 'Age', '']} />
            <tbody>
              {sec.rfis.map((r) => (
                <TableRow key={r.id} onClick={() => console.log(`navigate → ${sec.project} rfis`)} cells={[
                  <TdN>{r.id}</TdN>, <>{r.desc}</>, <>{r.age}</>,
                  <span style={{ color: COLORS.blue, fontSize: '0.7rem', fontWeight: 600 }}>View →</span>,
                ]} />
              ))}
            </tbody>
          </table>
          {sec.more && (
            <div
              style={{ padding: '6px 12px', fontSize: '0.7rem', color: COLORS.blue, fontWeight: 600, cursor: 'pointer', borderBottom: `1px solid ${COLORS.border}` }}
              onClick={() => console.log(`navigate → ${sec.project} rfis`)}
            >
              + {sec.more} more open RFIs →
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Card6Body() {
  const invData = [
    { project: 'Cherry Hills', count: 4, paid: 150000, pct: 36, color: COLORS.green },
    { project: 'Tower 14', count: 4, paid: 210000, pct: 31, color: COLORS.green },
    { project: 'Mesa Logistics', count: 4, paid: 260000, pct: 90, color: COLORS.green },
    { project: 'Apex Retail', count: 0, paid: 0, pct: 0, color: COLORS.yellow },
    { project: 'Hyatt Studios', count: 3, paid: 180000, pct: 24, color: COLORS.amber },
  ];
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <THead cols={['Project', '# Invoices', 'Total Paid', '% of Contract']} />
      <tbody>
        {invData.map((d) => (
          <TableRow key={d.project} onClick={() => console.log(`navigate → ${d.project} invoices`)} cells={[
            <TdN>{d.project}</TdN>,
            <>{d.count > 0 ? `${d.count} invoices` : '—'}</>,
            <TdM>{d.paid > 0 ? fmt(d.paid) : '—'}</TdM>,
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {d.pct > 0 && <Bar pct={d.pct} color={d.color} />}
              <span>{d.pct > 0 ? `${d.pct}%` : '—'}</span>
            </div>,
          ]} />
        ))}
        <TableRow isTotal cells={['', '15 invoices', <TdM>{fmt(totalInvoiced)}</TdM>, '30%']} />
      </tbody>
    </table>
  );
}

function Card7Body() {
  const pending = [
    { id: 'INV-1048', project: 'Cherry Hills', desc: 'Phase 1 labor billing — Apex Framing', time: '4 hr ago', amount: 18400, pill: 'pr' as PillType, pillText: 'Overdue' },
    { id: 'INV-T14-042', project: 'Tower 14', desc: 'Structural labor Level 6-7', time: '2 days ago', amount: 42000, pill: 'pr' as PillType, pillText: 'Overdue' },
    { id: 'INV-MLH-019', project: 'Mesa Logistics', desc: 'MEP rough-in closeout billing', time: '1 day ago', amount: 12000, pill: 'pw' as PillType, pillText: 'Pending' },
    { id: 'INV-HSD-028', project: 'Hyatt Studios', desc: 'EIFS Level 2-3 install', time: '6 hr ago', amount: 28500, pill: 'pw' as PillType, pillText: 'Pending' },
  ];
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <THead cols={['Invoice', 'Project', 'Description', 'Submitted', 'Amount']} />
      <tbody>
        {pending.map((d) => (
          <TableRow key={d.id} onClick={() => console.log(`navigate → ${d.project} invoices`)} cells={[
            <div><TdN>{d.id}</TdN><TdS>Approve →</TdS></div>,
            <>{d.project}</>,
            <>{d.desc}</>,
            <>{d.time}</>,
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
              <TdM>{fmt(d.amount)}</TdM>
              <Pill type={d.pill}>{d.pillText}</Pill>
            </div>,
          ]} />
        ))}
        <TableRow isTotal cells={['', '', '', '', <TdM>$100,900</TdM>]} />
      </tbody>
    </table>
  );
}

function Card8Body() {
  const tcs = [
    { project: 'Cherry Hills', tc: 'Apex Framing Co.', contract: 368000, invoiced: 113400 },
    { project: 'Tower 14', tc: 'Apex Framing Co.', contract: 595000, invoiced: 172000 },
    { project: 'Mesa Logistics', tc: 'Mesa Build Group', contract: 248000, invoiced: 247000 },
    { project: 'Apex Retail', tc: 'Rocky Mtn Contractors', contract: 0, invoiced: 0 },
    { project: 'Hyatt Studios', tc: 'Mesa Build Group', contract: 650000, invoiced: 208500 },
  ];
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
       <THead cols={['Project', 'Trade Contractor', 'Contract Value', 'Invoiced to Date']} />
      <tbody>
        {tcs.map((d) => (
          <TableRow key={d.project} onClick={() => console.log(`navigate → ${d.project} contracts`)} cells={[
            <TdN>{d.project}</TdN>,
            <>{d.tc}</>,
            <TdM>{d.contract > 0 ? fmt(d.contract) : '—'}</TdM>,
            <TdM>{d.invoiced > 0 ? fmt(d.invoiced) : 'Setup'}</TdM>,
          ]} />
        ))}
        <TableRow isTotal cells={['', '4 Trade Contractors', <TdM>{fmt(totalTC)}</TdM>, '']} />
      </tbody>
    </table>
  );
}

/* ─── Warn Item ─── */
function WarnItem({ color, icon, title, sub, value, pill, pillType, onClick }: {
  color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
        borderLeft: `3px solid ${color}`, borderBottom: `1px solid ${COLORS.border}`,
        cursor: 'pointer', transition: 'all 0.15s',
        ...fontLabel,
      }}
      className="hover:translate-x-[2px] hover:bg-[#F7F9FC]"
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: COLORS.ink, fontSize: '0.78rem' }}>{title}</div>
        <div style={{ fontSize: '0.64rem', color: COLORS.muted }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ ...fontMono, fontSize: '0.78rem', color: COLORS.ink2, fontWeight: 700 }}>{value}</div>
        <Pill type={pillType}>{pill}</Pill>
      </div>
    </div>
  );
}

/* ─── Project Card ─── */
function ProjectCard({ p }: { p: typeof PROJECTS[0] }) {
  const status: PillType = p.progress >= 80 ? 'pg' : p.progress >= 50 ? 'pa' : p.progress >= 30 ? 'pb' : 'pm';
  const statusText = p.progress >= 80 ? 'On Track' : p.progress >= 50 ? 'In Progress' : p.progress >= 30 ? 'Active' : 'Pre-con';
  return (
    <div
      style={{
        background: COLORS.surface, borderRadius: 12, border: `1px solid ${COLORS.border}`,
        padding: '14px 16px', cursor: 'pointer', ...fontLabel,
      }}
      className="hover:border-[#F5A623] hover:shadow-sm transition-all"
      onClick={() => console.log(`navigate → ${p.name} overview`)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.barColor }} />
        <span style={{ fontWeight: 700, color: COLORS.ink, fontSize: '0.82rem' }}>{p.name}</span>
      </div>
      <div style={{ fontSize: '0.64rem', color: COLORS.faint, marginBottom: 8 }}>{p.phase}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, height: 4, background: COLORS.border, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${p.progress}%`, background: p.barColor, borderRadius: 4 }} />
        </div>
        <span style={{ fontSize: '0.67rem', fontWeight: 600, color: COLORS.muted }}>{p.progress}%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...fontMono, fontSize: '0.82rem', fontWeight: 700, color: COLORS.ink2 }}>{fmt(p.budget)}</span>
        <Pill type={status}>{statusText}</Pill>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function PlatformGCDashboard() {
  return (
    <PlatformLayout title="GC Dashboard" breadcrumbs={[{ label: 'Platform', href: '/platform' }, { label: 'GC Dashboard' }]}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 mb-6">
          <KpiCard idx={0} accent={COLORS.amber} icon={<Briefcase size={18} color={COLORS.amberD} />} iconBg={COLORS.amberPale}
            label="TOTAL OWNER BUDGET" value={fmt(totalBudget)} sub="5 projects · full portfolio value"
            pills={[{ type: 'pa', text: 'Portfolio' }]}>
            <Card1Body />
          </KpiCard>

          <KpiCard idx={1} accent={COLORS.green} icon={<TrendingUp size={18} color={COLORS.green} />} iconBg={COLORS.greenBg}
            label="GENERAL CONTRACTOR PROFIT MARGIN" value={fmt(totalMargin)} sub="30% overall · Owner budget minus Trade Contractor contracts"
            pills={[{ type: 'pg', text: '↑ 30%' }]}>
            <Card2Body />
          </KpiCard>

          <KpiCard idx={2} accent={COLORS.blue} icon={<FileText size={18} color={COLORS.blue} />} iconBg={COLORS.blueBg}
            label="CHANGE ORDERS TOTAL" value={`+${fmt(totalCOVal)}`} sub={`${totalCOs} COs across all projects`}
            pills={[{ type: 'pb', text: `${totalCOs} COs` }]}>
            <Card3Body />
          </KpiCard>

          <KpiCard idx={3} accent={COLORS.purple} icon={<Package size={18} color={COLORS.purple} />} iconBg={COLORS.purpleBg}
            label="MATERIALS BUDGET (GENERAL CONTRACTOR POs)" value="$192.3K" sub="$209.5K estimated · 92% of estimate spent"
            pills={[{ type: 'pg', text: '92% of est' }]}>
            <Card4Body />
          </KpiCard>

          <KpiCard idx={4} accent={COLORS.red} icon={<HelpCircle size={18} color={COLORS.red} />} iconBg={COLORS.redBg}
            label="OPEN RFIs" value={`${totalRfisOpen} Open`} sub={`${totalRfisOpen + totalRfisClosed} total · ${totalRfisClosed} resolved · avg 3.8 days to close`}
            pills={[{ type: 'pr', text: `${totalRfisOpen} need response` }]}>
            <Card5Body />
          </KpiCard>

          <KpiCard idx={5} accent={COLORS.green} icon={<CheckCircle size={18} color={COLORS.green} />} iconBg={COLORS.greenBg}
            label="TOTAL PAID INVOICES" value={fmt(totalInvoiced)} sub="30% of total portfolio value"
            pills={[{ type: 'pg', text: '↑ On track' }]}>
            <Card6Body />
          </KpiCard>

          <KpiCard idx={6} accent={COLORS.red} icon={<Clock size={18} color={COLORS.red} />} iconBg={COLORS.redBg}
            label="PENDING GENERAL CONTRACTOR APPROVAL" value="$100.9K" sub="4 invoices awaiting your review"
            pills={[{ type: 'pr', text: 'Action needed' }]}>
            <Card7Body />
          </KpiCard>

          <KpiCard idx={7} accent={COLORS.navy} icon={<Handshake size={18} color={COLORS.navy} />} iconBg={COLORS.surface2}
            label="TRADE CONTRACTOR CONTRACTS COMMITTED" value={fmt(totalTC)} sub="Contracted with 4 Trade Contractors · 70% of owner budget"
            pills={[{ type: 'pm', text: '4 TCs' }]}>
            <Card8Body />
          </KpiCard>
        </div>

        {/* Portfolio Metrics Table */}
        <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}`, fontWeight: 700, color: COLORS.ink, fontSize: '0.9rem', ...fontLabel }}>
            📊 Portfolio Metrics
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <THead cols={['Project', 'Owner Budget', 'Trade Contractor Contract', 'General Contractor Margin', 'Total Invoiced', 'CO Value', 'CO %', 'Mat. Health', 'Status']} />
              <tbody>
                {PROJECTS.map((p) => {
                  const margin = p.tcContract > 0 ? p.budget - p.tcContract : 0;
                  const invPct = p.tcContract > 0 ? Math.round((p.invoiced / p.tcContract) * 100) : 0;
                  const matHealth = p.name.includes('Cherry') ? { pill: 'pg' as PillType, text: '92%' } : p.name.includes('Tower') ? { pill: 'pr' as PillType, text: '100%' } : null;
                  const status: PillType = p.progress >= 80 ? 'pg' : p.progress >= 50 ? 'pa' : p.progress >= 30 ? 'pb' : 'pm';
                  const statusText = p.progress >= 80 ? 'On Track' : p.progress >= 50 ? 'Active' : p.progress >= 30 ? 'Active' : 'Pre-con';
                  return (
                    <TableRow key={p.name} onClick={() => console.log(`navigate → ${p.name} overview`)} cells={[
                      <TdN>{p.name}</TdN>,
                      <TdM>{fmt(p.budget)}</TdM>,
                      <TdM>{p.tcContract > 0 ? fmt(p.tcContract) : '—'}</TdM>,
                      <TdM>{margin > 0 ? fmt(margin) : '—'}</TdM>,
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Bar pct={invPct} color={invPct >= 80 ? COLORS.green : COLORS.amber} />
                        <TdM>{p.invoiced > 0 ? fmt(p.invoiced) : '—'}</TdM>
                      </div>,
                      <TdM>{p.coVal > 0 ? `+${fmt(p.coVal)}` : '—'}</TdM>,
                      <>{p.tcContract > 0 ? `${((p.coVal / p.tcContract) * 100).toFixed(1)}%` : '—'}</>,
                      <>{matHealth ? <Pill type={matHealth.pill}>{matHealth.text}</Pill> : '—'}</>,
                      <Pill type={status}>{statusText}</Pill>,
                    ]} />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Needs Immediate Attention */}
        <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}`, fontWeight: 700, color: COLORS.ink, fontSize: '0.9rem', ...fontLabel }}>
            🚨 Needs Immediate Attention
          </div>
          <WarnItem color={COLORS.red} icon="💰" title="INV-1048 — Awaiting Your Approval (4+ hrs)" sub="Cherry Hills · Apex Framing Co." value="$18,400" pill="Overdue" pillType="pr" />
          <WarnItem color={COLORS.red} icon="💰" title="INV-T14-042 — Pending Approval 2 Days" sub="Tower 14 · Apex Framing Co." value="$42,000" pill="Overdue" pillType="pr" />
          <WarnItem color={COLORS.red} icon="📦" title="Tower 14 — Structural Steel Over Budget $6K" sub="Ordered $91K vs $85K est · Forecast margin impact" value="+$6,000" pill="Over Budget" pillType="pr" />
          <WarnItem color={COLORS.yellow} icon="🚚" title="PO-2213 Lumber Delivery Tomorrow — Confirm Site Plan" sub="Cherry Hills · Cascade Lumber · 4,200 LF" value="$24,600" pill="Tomorrow" pillType="pw" />
          <WarnItem color={COLORS.yellow} icon="⚒" title="WO-045 Budget Variance +$1,800 Over Estimate" sub="Cherry Hills · Roof sheathing Bldg A" value="+$1,800" pill="Review" pillType="pw" />
           <WarnItem color={COLORS.blue} icon="❓" title="Tower 14 — 7 Open RFIs Blocking Level 8 Work" sub="Oldest: 8 days · Structural decisions required" value="7 RFIs" pill="Action Needed" pillType="pb" />
           <WarnItem color={COLORS.blue} icon="📋" title="CO-T14-04 & CO-T14-05 Pending General Contractor Approval" sub="Tower 14 · $7,900 combined" value="$7,900" pill="Pending" pillType="pb" />
        </div>

        {/* All Projects Grid */}
        <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontWeight: 700, color: COLORS.ink, fontSize: '0.9rem', ...fontLabel }}>📋 All Projects</span>
            <span style={{ fontSize: '0.7rem', color: COLORS.blue, fontWeight: 600, cursor: 'pointer' }}>Full Portfolio →</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 p-4">
            {PROJECTS.map((p) => <ProjectCard key={p.name} p={p} />)}
          </div>
        </div>

      </div>
    </PlatformLayout>
  );
}
