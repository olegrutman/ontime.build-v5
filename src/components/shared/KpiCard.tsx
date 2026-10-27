import { forwardRef, useState, type ReactNode } from 'react';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/* ─── Design tokens ─── */
export const C = {
  amber: 'hsl(var(--primary))', amberD: 'hsl(var(--amber-d))', amberPale: 'hsl(var(--state-open-bg))',
  navy: 'hsl(var(--navy))', navyL: 'hsl(var(--navy-line))',
  bg: 'hsl(var(--background))', surface: 'hsl(var(--card))', surface2: 'hsl(var(--surface))',
  border: 'hsl(var(--border))', ink: 'hsl(var(--foreground))', ink2: 'hsl(var(--card-foreground))', muted: 'hsl(var(--muted-foreground))', faint: 'hsl(var(--muted-foreground))',
  green: 'hsl(var(--state-approved))', greenBg: 'hsl(var(--state-approved-bg))', greenDark: 'hsl(var(--state-approved-foreground))',
  red: 'hsl(var(--destructive))', redBg: 'hsl(var(--destructive) / .1)',
  blue: 'hsl(var(--type-sov))', blueBg: 'hsl(var(--type-sov) / .1)',
  yellow: 'hsl(var(--budget-tight))', yellowBg: 'hsl(var(--budget-tight) / .1)',
  purple: 'hsl(var(--type-project))', purpleBg: 'hsl(var(--type-project) / .1)',
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
  pn: { bg: C.navy, color: 'hsl(var(--navy-fg))' },
};

export const Pill = forwardRef<HTMLSpanElement, { type: PillType; children: ReactNode }>(function Pill({ type, children }, ref) {
  const s = PILL_S[type];
  return (
    <span ref={ref} style={{ fontSize: '0.59rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: s.bg, color: s.color, border: s.border || 'none', maxWidth: '100%', overflowWrap: 'anywhere', ...fontLabel }}>
      {children}
    </span>
  );
});

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
export function KpiCard({ accent, icon, iconBg, label, value, sub, pills = [], children, idx = 0, spark, headerAction, className }: {
  accent: string; icon: ReactNode; iconBg: string; label: string; value: string; sub: string;
  pills?: { type: PillType; text: string }[]; children?: ReactNode; idx?: number;
  spark?: ReactNode; headerAction?: ReactNode; className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <section data-kpi-card={label} className={cn('min-w-0 max-w-full self-stretch overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm motion-safe:animate-fade-in flex flex-col', className)} style={{ animationDelay: `${idx * 0.04}s`, ...fontLabel }}>
        <div className="h-[3px] shrink-0" style={{ background: accent }} />
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <div className="mb-2 flex min-h-9 items-start justify-between gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: iconBg, color: accent }}>{icon}</div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
              {pills.map((p, i) => <Pill key={`${p.text}-${i}`} type={p.type}>{p.text}</Pill>)}
              {headerAction}
            </div>
          </div>
          <Button variant="ghost" onClick={() => setOpen(true)} aria-label={`View ${label} breakdown`} className="h-auto w-full flex-1 flex-col items-start justify-start gap-0 rounded-none p-0 text-left hover:bg-transparent hover:text-foreground">
            <span className="min-h-8 text-[0.7rem] font-semibold uppercase leading-snug text-muted-foreground [overflow-wrap:anywhere]">{label}</span>
            <span className="flex w-full min-w-0 items-end justify-between gap-2">
              <span className="min-w-0 text-2xl sm:text-[2rem] leading-tight tabular-nums text-foreground [overflow-wrap:anywhere]" style={fontVal}>{value}</span>
              {spark && <span className="shrink-0">{spark}</span>}
            </span>
            <span className="mt-1 min-h-9 text-[0.75rem] font-normal leading-snug text-muted-foreground [overflow-wrap:anywhere]">{sub}</span>
          </Button>
        </div>
        <Button variant="ghost" onClick={() => setOpen(true)} className="h-auto min-h-10 w-full shrink-0 justify-between rounded-none border-t border-border bg-accent px-3 py-2 text-xs text-muted-foreground hover:bg-primary/10 hover:text-foreground">
          <span>View breakdown</span><Maximize2 size={12} />
        </Button>
      </section>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl w-[calc(100vw-1rem)] max-w-3xl max-h-[90dvh] flex flex-col" style={fontLabel}>
          <div className="h-1 shrink-0" style={{ background: accent }} />
          <DialogHeader className="border-b border-border px-4 sm:px-6 pt-4 pb-3 text-left space-y-1">
            <div className="flex items-center gap-3 pr-8">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: iconBg, color: accent }}>{icon}</div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-[0.7rem] uppercase text-muted-foreground [overflow-wrap:anywhere]">{label}</DialogTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-3xl leading-tight text-foreground [overflow-wrap:anywhere]" style={fontVal}>{value}</span>
                  {pills.map((p, i) => <Pill key={i} type={p.type}>{p.text}</Pill>)}
                </div>
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{sub}</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1 min-h-0">
            {children ?? <div className="p-4 text-sm text-muted-foreground">{sub}<div className="mt-3 text-xl text-foreground" style={fontMono}>{value}</div></div>}
          </div>
        </DialogContent>
      </Dialog>
    </>
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

export const TdN = forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>(function TdN({ children, style, ...props }, ref) {
  return <span {...props} ref={ref} style={{ fontWeight: 700, color: C.ink, ...style }}>{children}</span>;
});
export const TdM = forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>(function TdM({ children, style, ...props }, ref) {
  return <span {...props} ref={ref} style={{ ...fontMono, fontSize: '0.78rem', color: C.ink2, ...style }}>{children}</span>;
});

export const cellStyle = { padding: '7px 9px', fontSize: '0.74rem', color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' as const };
export const cellStyleR = { ...cellStyle, textAlign: 'right' as const };
export const totalRowStyle = { background: C.surface2, fontWeight: 700 };

export const TRow = forwardRef<HTMLTableRowElement, { cells: ReactNode[]; isTotal?: boolean; greenText?: boolean; onClick?: () => void }>(function TRow({ cells, isTotal, greenText, onClick }, ref) {
  return (
    <tr ref={ref} style={{ ...(isTotal ? totalRowStyle : { cursor: 'pointer' }), ...(greenText ? { color: C.green } : {}) }} className={isTotal ? '' : 'hover:bg-[rgba(245,166,35,.05)]'} onClick={onClick}>
      {cells.map((c, i) => <td key={i} style={i === cells.length - 1 ? cellStyleR : cellStyle}>{c}</td>)}
    </tr>
  );
});

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
