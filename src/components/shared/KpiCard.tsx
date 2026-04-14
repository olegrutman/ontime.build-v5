import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/* ─── Design tokens ─── */
export const C = {
  amber: '#F5A623', amberD: '#C8850A', amberPale: '#FFF7E6',
  navy: '#0D1F3C', navyL: '#162E52',
  bg: '#F0F2F7', surface: '#FFFFFF', surface2: '#F7F9FC',
  border: '#E4E8F0', ink: '#0F1923', ink2: '#253347', muted: '#5A6A7E', faint: '#9AAABB',
  green: '#059669', greenBg: '#ECFDF5', greenDark: '#047857',
  red: '#DC2626', redBg: '#FEF2F2',
  blue: '#2563EB', blueBg: '#EFF6FF',
  yellow: '#D97706', yellowBg: '#FFFBEB',
  purple: '#7C3AED', purpleBg: '#F5F3FF',
};

export const fontVal = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 } as const;
export const fontMono = { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 } as const;
export const fontLabel = { fontFamily: "'DM Sans', sans-serif" } as const;

/* ─── Helpers ─── */
export function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `$${n.toLocaleString()}`;
}

export function fmtSigned(n: number): string {
  return n >= 0 ? `+${fmt(n)}` : `-${fmt(Math.abs(n))}`;
}

/* ─── Pill ─── */
export type PillType = 'pg' | 'pr' | 'pa' | 'pb' | 'pm' | 'pw' | 'pn';
const PILL_S: Record<PillType, { bg: string; color: string; border?: string }> = {
  pg: { bg: C.greenBg, color: C.green },
  pr: { bg: C.redBg, color: C.red },
  pa: { bg: C.amberPale, color: C.amberD },
  pb: { bg: C.blueBg, color: C.blue },
  pm: { bg: C.surface2, color: C.muted, border: `1px solid ${C.border}` },
  pw: { bg: C.yellowBg, color: C.yellow },
  pn: { bg: C.navy, color: '#FFF' },
};

export function Pill({ type, children }: { type: PillType; children: ReactNode }) {
  const s = PILL_S[type];
  return (
    <span style={{ fontSize: '0.59rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: s.bg, color: s.color, border: s.border || 'none', whiteSpace: 'nowrap', ...fontLabel }}>
      {children}
    </span>
  );
}

/* ─── Bar ─── */
export function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: C.border, borderRadius: 4, width: 80, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4 }} />
    </div>
  );
}

/* ─── BarRow (used in project overviews) ─── */
export function BarRow({ label, value, pct, barColor }: { label: string; value: string; pct: number; barColor: string }) {
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

/* ─── KPI Card ─── */
export function KpiCard({ accent, icon, iconBg, label, value, sub, pills, children, idx }: {
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
        {/* Icon + Pills row — fixed height */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, minHeight: 36 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', minHeight: 22 }}>
            {pills.map((p, i) => <Pill key={i} type={p.type}>{p.text}</Pill>)}
          </div>
        </div>
        {/* Label — fixed height zone for alignment */}
        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, marginBottom: 2, fontWeight: 600, minHeight: 28, display: 'flex', alignItems: 'flex-start' }}>
          <span className="line-clamp-2">{label}</span>
        </div>
        {/* Value — single line */}
        <div style={{ fontSize: '2rem', color: C.ink, lineHeight: 1.1, marginBottom: 2, minHeight: 36, display: 'flex', alignItems: 'center', ...fontVal }}>{value}</div>
        {/* Sub — fixed height zone */}
        <div style={{ fontSize: '0.67rem', color: C.muted, marginBottom: 10, minHeight: 24 }}>
          <span className="line-clamp-2">{sub}</span>
        </div>
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: C.surface2, fontSize: '0.67rem', color: C.muted, fontWeight: 600, borderTop: `1px solid ${C.border}` }}
        className="hover:bg-[#FFF7E6] transition-colors"
      >
        <span>{open ? 'Collapse' : 'Expand for detail'}</span>
        <ChevronRight size={13} style={{ transition: 'transform 0.3s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }} />
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ maxHeight: open ? 1600 : 0, overflow: open ? 'auto' : 'hidden', transition: 'max-height 0.44s cubic-bezier(.22,1,.36,1), opacity 0.3s', opacity: open ? 1 : 0 }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Table helpers ─── */
export function THead({ cols }: { cols: string[] }) {
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

export function TdN({ children }: { children: ReactNode }) { return <span style={{ fontWeight: 700, color: C.ink }}>{children}</span>; }
export function TdM({ children }: { children: ReactNode }) { return <span style={{ ...fontMono, fontSize: '0.78rem', color: C.ink2 }}>{children}</span>; }

export const cellStyle = { padding: '9px 12px', fontSize: '0.76rem', color: C.muted, borderBottom: `1px solid ${C.border}` };
export const cellStyleR = { ...cellStyle, textAlign: 'right' as const };
export const totalRowStyle = { background: C.surface2, fontWeight: 700 };

export function TRow({ cells, isTotal, greenText, onClick }: { cells: ReactNode[]; isTotal?: boolean; greenText?: boolean; onClick?: () => void }) {
  return (
    <tr style={{ ...(isTotal ? totalRowStyle : { cursor: 'pointer' }), ...(greenText ? { color: C.green } : {}) }} className={isTotal ? '' : 'hover:bg-[rgba(245,166,35,.05)]'} onClick={onClick}>
      {cells.map((c, i) => <td key={i} style={i === cells.length - 1 ? cellStyleR : cellStyle}>{c}</td>)}
    </tr>
  );
}

/* ─── WarnItem ─── */
export function WarnItem({ color, icon, title, sub, value, pill, pillType, onClick }: {
  color: string; icon: string; title: string; sub: string; value: string; pill: string; pillType: PillType; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderLeft: `3px solid ${color}`, borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.15s', ...fontLabel }} className="hover:translate-x-[2px] hover:bg-[#F7F9FC]">
      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: C.ink, fontSize: '0.78rem' }}>{title}</div>
        <div style={{ fontSize: '0.64rem', color: C.muted }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ ...fontMono, fontSize: '0.78rem', color: C.ink2, fontWeight: 700 }}>{value}</div>
        <Pill type={pillType}>{pill}</Pill>
      </div>
    </div>
  );
}

/* ─── ProjectCard ─── */
const STATUS_PILL_MAP: Record<string, { type: PillType; label: string }> = {
  active: { type: 'pg', label: 'Active' },
  setup: { type: 'pm', label: 'Setup' },
  draft: { type: 'pm', label: 'Setup' },
  on_hold: { type: 'pw', label: 'On Hold' },
  completed: { type: 'pb', label: 'Completed' },
  archived: { type: 'pm', label: 'Archived' },
};

export function ProjectCard({ name, status, budget, costs, labels, onClick }: {
  name: string; status: string; budget: number; costs: number;
  labels?: { budget: string; costs: string; margin: string };
  onClick: () => void;
}) {
  const margin = budget - costs;
  const pill = STATUS_PILL_MAP[status] || { type: 'pm' as PillType, label: status };
  const dotColor = status === 'active' ? C.green : status === 'on_hold' ? C.yellow : status === 'completed' ? C.blue : C.faint;
  const l = labels || { budget: 'Contract', costs: 'Cost', margin: 'Margin' };
  return (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px', cursor: 'pointer', ...fontLabel }} className="hover:border-[#F5A623] hover:shadow-sm transition-all" onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
        <span style={{ fontWeight: 700, color: C.ink, fontSize: '0.82rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      </div>
      <div style={{ marginBottom: 10 }}>
        <Pill type={pill.type}>{pill.label}</Pill>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: l.budget, value: fmt(budget) },
          { label: l.costs, value: fmt(costs) },
          { label: l.margin, value: fmt(margin), color: margin >= 0 ? C.green : C.red },
        ].map((m, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.56rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: C.faint, fontWeight: 600 }}>{m.label}</div>
            <div style={{ ...fontMono, fontSize: '0.76rem', fontWeight: 700, color: m.color || C.ink2, marginTop: 1 }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const BAR_COLORS = [C.amber, C.blue, C.green, C.yellow, C.purple, C.red, C.navy];
