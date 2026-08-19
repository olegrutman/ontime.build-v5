import { type ReactNode } from 'react';
import { C, fontLabel, fontMono, KpiCard, type PillType } from '@/components/shared/KpiCard';
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
    <KpiCard
      accent={accent}
      icon={icon}
      iconBg={iconBg}
      label={label}
      value={suffix && term.known ? `${headline} ${suffix}` : headline}
      sub={term.formula}
      pills={allPills}
      idx={idx}
    >
      <div style={{ padding: '10px 14px 14px', ...fontLabel }}>
        <div
          style={{
            fontSize: '0.62rem', color: C.muted, background: C.surface2,
            border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 9px', marginBottom: 10,
          }}
        >
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700, color: C.faint }}>Formula</span>{' '}
          <span style={{ ...fontMono, fontSize: '0.68rem', color: C.ink2 }}>{term.formula}</span>
          <div style={{ marginTop: 3, color: C.faint, fontSize: '0.6rem' }}>{BASIS_LABEL[term.basis]}</div>
        </div>

        {rows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
                  padding: '6px 0', borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${C.border}`,
                  opacity: r.excluded ? 0.5 : 1,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: r.emphasis ? 700 : 600, color: r.emphasis ? C.ink : C.ink2 }}>
                    {r.label}
                  </div>
                  {r.note && <div style={{ fontSize: '0.6rem', color: C.faint }}>{r.note}</div>}
                </div>
                <div style={{ ...fontMono, fontSize: '0.76rem', fontWeight: 700, color: r.emphasis ? C.ink : C.ink2, whiteSpace: 'nowrap' }}>
                  {r.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {footnote && <div style={{ fontSize: '0.62rem', color: C.faint, marginTop: 8 }}>{footnote}</div>}
        {children}
      </div>
    </KpiCard>
  );
}
