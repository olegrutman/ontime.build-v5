import { type ReactNode } from 'react';
import { C, fontMono, KpiCard, type PillType } from '@/components/shared/KpiCard';
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
    <KpiCard label={label} value={suffix && term.known ? `${headline} ${suffix}` : headline}
      sub={term.formula} accent={accent} icon={icon} iconBg={iconBg} idx={idx} pills={allPills}>
      <div className="space-y-3 p-4 sm:p-6">
        <div className="rounded-lg border border-border bg-accent p-3 text-xs text-foreground [overflow-wrap:anywhere]" style={fontMono}>
          {term.formula}
          <div className="mt-1 text-[0.7rem] font-sans uppercase text-muted-foreground">{BASIS_LABEL[term.basis]}</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border py-2 ${r.excluded ? 'opacity-60' : ''}`}>
            <div className="min-w-0 flex-1 basis-32 [overflow-wrap:anywhere]">
              <div className={`text-sm ${r.emphasis ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{r.label}</div>
              {r.note && <div className="mt-0.5 text-xs text-muted-foreground">{r.note}</div>}
            </div>
            <div className="max-w-full text-sm font-bold text-foreground [overflow-wrap:anywhere]" style={fontMono}>{r.value}</div>
          </div>
        ))}
        {footnote && <div className="text-xs text-muted-foreground">{footnote}</div>}
        {children}
      </div>
    </KpiCard>
  );
}
