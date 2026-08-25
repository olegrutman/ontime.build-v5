import { type ReactNode } from 'react';
import { C, fontLabel, fontMono, Pill, type PillType } from '@/components/shared/KpiCard';
import type { Basis, LedgerTerm } from '@/lib/kpiLedger';
import { money } from '@/lib/kpiLedger';

const BASIS_LABEL: Record<Basis, string> = {
  contract: 'Contract basis · pre-tax',
  cash: 'Cash basis · tax incl.',
  forecast: 'Forecast',
};

export interface DrilldownRow {
  label: string;
  value: string;
  note?: string;
  /** Renders greyed — shown for context but excluded from the headline. */
  excluded?: boolean;
  emphasis?: boolean;
}

/**
 * One card grammar for every financial KPI:
 *   label → headline → formula strip → basis pill → drilldown rows
 * The formula strip prints the actual math so a wrong number is visible, and an
 * unknown input renders "Not set" instead of a misleading $0.
 */
export function FinancialKpiCard({
  label, term, accent, icon, iconBg, idx, valueOverride, suffix, pills = [], rows = [], footnote, children,
}: {
  label: string;
  term: LedgerTerm;
  accent: string;
  icon: ReactNode;
  iconBg: string;
  idx: number;
  /** Use when the headline is not a plain money value (e.g. a percentage). */
  valueOverride?: string;
  suffix?: string;
  pills?: { type: PillType; text: string }[];
  rows?: DrilldownRow[];
  footnote?: string;
  children?: ReactNode;
}) {
  const headline = !term.known ? 'Not set' : (valueOverride ?? money(term.value));
  const allPills: { type: PillType; text: string }[] = [
    ...pills,
    { type: term.basis === 'cash' ? 'pg' : term.basis === 'forecast' ? 'pw' : 'pn', text: BASIS_LABEL[term.basis].split(' · ')[0] },
  ];

  return (
    <section
      className="animate-fade-in rounded-2xl p-3.5 sm:p-4"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        boxShadow: '0 1px 3px rgba(15,25,35,.05)',
        animationDelay: `${idx * 0.04}s`,
        ...fontLabel,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: iconBg, color: accent, fontSize: 17 }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div
              className="line-clamp-2"
              style={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, fontWeight: 800 }}
            >
              {label}
            </div>
            <div style={{ marginTop: 3, color: C.ink, fontSize: '1.9rem', lineHeight: 1, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}>
              {suffix && term.known ? `${headline} ${suffix}` : headline}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {allPills.map((p, i) => <Pill key={`${p.text}-${i}`} type={p.type}>{p.text}</Pill>)}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          padding: '7px 9px',
          borderRadius: 10,
          background: C.surface2,
          border: `1px solid ${C.border}`,
          color: C.ink2,
          fontSize: '0.68rem',
          ...fontMono,
        }}
      >
        {term.formula}
        <div style={{ marginTop: 3, color: C.faint, fontSize: '0.58rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {BASIS_LABEL[term.basis]}
        </div>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 10 }}>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
                padding: '6px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                opacity: r.excluded ? 0.55 : 1,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: r.emphasis ? 800 : 600, color: r.emphasis ? C.ink : C.ink2 }}>
                  {r.label}
                </div>
                {r.note && <div className="line-clamp-2" style={{ fontSize: '0.6rem', color: C.faint }}>{r.note}</div>}
              </div>
              <div style={{ ...fontMono, fontSize: '0.76rem', fontWeight: 800, color: r.emphasis ? C.ink : C.ink2, whiteSpace: 'nowrap' }}>
                {r.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {footnote && <div style={{ fontSize: '0.62rem', color: C.faint, marginTop: 8 }}>{footnote}</div>}
      {children}
    </section>
  );
}
