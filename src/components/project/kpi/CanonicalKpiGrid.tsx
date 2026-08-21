import { C } from '@/components/shared/KpiCard';
import { FinancialKpiCard, type DrilldownRow } from './FinancialKpiCard';
import { money, type ProjectLedger } from '@/lib/kpiLedger';

export interface CanonicalKpiExtras {
  /** Who the viewer bills (GC name for a TC, owner for a GC, TC name for an FC). */
  billsTo?: string;
  /** Who bills the viewer (crew / subs). */
  paidParties?: string;
  approvedCOCount?: number;
  pendingCOCount?: number;
  /** Label swap for T&M projects. */
  coWord?: 'CO' | 'WO';
}

const pct = (n: number) => `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`;

/**
 * The six canonical financial cards, identical math for every role. Role-specific
 * cards live in the role overview and use the same `ProjectLedger` terms.
 */
export function CanonicalKpiGrid({ ledger, extras = {} }: { ledger: ProjectLedger; extras?: CanonicalKpiExtras }) {
  const co = extras.coWord ?? 'CO';
  const coPlural = `${co}s`;
  const billsTo = extras.billsTo || 'your client';

  const revenueRows: DrilldownRow[] = [
    { label: 'Base contract', value: money(ledger.baseContract.value), note: ledger.baseContract.formula },
    { label: `Approved ${coPlural}`, value: money(ledger.approvedCOAdds.value), note: `${extras.approvedCOCount ?? 0} approved` },
    { label: 'Revised total', value: money(ledger.revisedContract.value), emphasis: true },
    {
      label: `Pending ${coPlural}`, value: money(ledger.pendingCOAdds.value), excluded: true,
      note: `${extras.pendingCOCount ?? 0} awaiting approval — not counted in revenue`,
    },
  ];

  const costRows: DrilldownRow[] = [
    { label: 'Subs & crew contracts', value: money(ledger.baseCost.value), note: ledger.baseCost.formula },
    { label: `${co} cost`, value: money(ledger.coCost.value), note: ledger.coCost.formula },
    {
      label: 'Materials', value: ledger.materialCommitment.known ? money(ledger.materialCommitment.value) : '—',
      note: ledger.materialCommitment.formula, excluded: !ledger.materialCommitment.known,
    },
    { label: 'Revised cost', value: money(ledger.revisedCost.value), emphasis: true },
  ];

  const marginRows: DrilldownRow[] = [
    { label: 'Revised revenue', value: money(ledger.revisedContract.value) },
    { label: 'Revised cost', value: money(ledger.revisedCost.value) },
    { label: 'Forecast margin', value: `${money(ledger.forecastMargin.value)} · ${pct(ledger.forecastMarginPct)}`, emphasis: true },
    { label: `Pending ${co} net at risk`, value: money(ledger.pendingCONetAtRisk.value), excluded: true, note: ledger.pendingCONetAtRisk.formula },
  ];

  const billingRows: DrilldownRow[] = [
    { label: 'Billed (pre-tax)', value: money(ledger.billed.value), note: ledger.billed.formula },
    { label: 'Collected (tax incl.)', value: money(ledger.collected.value), note: ledger.collected.formula },
    { label: 'Retainage held', value: money(ledger.retainageHeld.value) },
    { label: 'Left to bill', value: money(ledger.outstanding.value), emphasis: true, note: ledger.outstanding.formula },
    {
      label: 'Awaiting approval', value: money(ledger.receivablesPendingAmount),
      note: `${ledger.receivablesPendingCount} invoice(s) submitted to ${billsTo}`, excluded: true,
    },
  ];

  const m2dRows: DrilldownRow[] = [
    { label: '% complete (billed ÷ revised)', value: pct(ledger.percentComplete) },
    { label: 'Billed to date', value: money(ledger.earnedRevenue.value), note: ledger.earnedRevenue.formula },
    {
      label: 'Cost incurred to date',
      value: ledger.earnedCost.known ? money(ledger.earnedCost.value) : '—',
      note: ledger.earnedCost.formula, excluded: !ledger.earnedCost.known,
    },
    { label: 'Margin to date', value: `${money(ledger.marginToDate.value)} · ${pct(ledger.marginToDatePct)}`, emphasis: true },
  ];


  const coRows: DrilldownRow[] = [
    { label: `Approved ${coPlural} revenue`, value: money(ledger.approvedCOAdds.value), note: `${extras.approvedCOCount ?? 0} approved` },
    { label: `Approved ${coPlural} cost`, value: money(ledger.coCost.value) },
    { label: `Net ${co} margin`, value: money(ledger.coNetMargin.value), emphasis: true },
    { label: `Pending ${coPlural} revenue`, value: money(ledger.pendingCOAdds.value), excluded: true },
    { label: `Pending ${coPlural} net`, value: money(ledger.pendingCONetAtRisk.value), excluded: true },
  ];

  const marginPillType = ledger.forecastMarginPct > 15 ? 'pg' : ledger.forecastMarginPct > 5 ? 'pw' : 'pr';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
      <FinancialKpiCard
        idx={0} label={`REVENUE (REVISED) — BILLED TO ${billsTo.toUpperCase()}`}
        term={ledger.revisedContract} accent={C.amber} icon="🤝" iconBg={C.amberPale}
        pills={[{ type: 'pa', text: 'Revenue' }]} rows={revenueRows}
        footnote={`Pending ${coPlural} are never included in revenue.`}
      />
      <FinancialKpiCard
        idx={1} label="COST (REVISED)"
        term={ledger.revisedCost} accent={C.red} icon="🧱" iconBg={C.redBg}
        pills={[{ type: 'pm', text: extras.paidParties || 'Subs, crew & materials' }]} rows={costRows}
        footnote="Materials only count as your cost when you are the responsible party."
      />
      <FinancialKpiCard
        idx={2} label="FORECAST MARGIN"
        term={ledger.forecastMargin} accent={C.green} icon="📈" iconBg={C.greenBg}
        suffix={ledger.revisedContract.known ? `· ${pct(ledger.forecastMarginPct)}` : undefined}
        pills={ledger.revisedContract.known ? [{ type: marginPillType, text: pct(ledger.forecastMarginPct) }] : []}
        rows={marginRows}
      />
      <FinancialKpiCard
        idx={3} label="BILLED & COLLECTED"
        term={ledger.billed} accent={C.blue} icon="🧾" iconBg={C.blueBg}
        suffix={`· ${pct(ledger.percentComplete)}`}
        pills={[{ type: 'pb', text: `${pct(ledger.percentComplete)} complete` }]} rows={billingRows}
        footnote="% complete compares pre-tax billed to the pre-tax revised contract."
      />
      <FinancialKpiCard
        idx={4} label="MARGIN TO DATE (EARNED)"
        term={ledger.marginToDate} accent={C.purple} icon="📊" iconBg={C.purpleBg}
        valueOverride={ledger.marginToDateMeaningful ? `${money(ledger.marginToDate.value)}` : undefined}
        suffix={ledger.marginToDateMeaningful ? `· ${pct(ledger.marginToDatePct)}` : undefined}
        pills={ledger.marginToDateMeaningful ? [{ type: ledger.marginToDatePct >= 10 ? 'pg' : 'pw', text: pct(ledger.marginToDatePct) }] : [{ type: 'pm', text: 'Not meaningful yet' }]}
        rows={m2dRows}
        footnote={ledger.marginToDateMeaningful ? undefined : 'Needs billing activity and recorded cost before this means anything.'}
      />
      <FinancialKpiCard
        idx={5} label={`${coPlural.toUpperCase()} — NET MARGIN`}
        term={ledger.coNetMargin} accent={C.navy} icon="📋" iconBg={C.surface2}
        pills={[{ type: 'pb', text: `${extras.approvedCOCount ?? 0} approved` }, ...(extras.pendingCOCount ? [{ type: 'pw' as const, text: `${extras.pendingCOCount} pending` }] : [])]}
        rows={coRows}
        footnote={`Only approved ${coPlural} count in the headline; pending are shown as exposure.`}
      />
    </div>
  );
}
