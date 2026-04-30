import { C, fontLabel, fontMono, fontVal, fmt, Pill, KpiCard, THead, TdN, TdM, TRow, type PillType } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import type { BuyerMaterialsAnalytics } from '@/hooks/useBuyerMaterialsAnalytics';

interface Props {
  analytics: BuyerMaterialsAnalytics | undefined;
  loading: boolean;
  onNavigate: (tab: string) => void;
}

function pctLabel(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

const STAGE_COLOR: Record<string, string> = {
  DRAFT: C.faint,
  SUBMITTED: C.blue,
  PRICED: C.amber,
  ORDERED: C.purple,
  READY_FOR_DELIVERY: C.amberD,
  DELIVERED: C.green,
  FINALIZED: C.greenDark,
};

export function BuyerMaterialsAnalyticsSection({ analytics, loading, onNavigate }: Props) {
  if (loading || !analytics) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: C.muted, fontSize: '0.78rem', ...fontLabel }}>
        Loading materials analytics…
      </div>
    );
  }

  const a = analytics;

  // ── Section header ──
  const SectionHeader = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: -4, ...fontLabel }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 4, height: 18, background: C.purple, borderRadius: 2 }} />
        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: C.ink, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Material Buyer Analytics
        </div>
      </div>
      <div style={{ fontSize: '0.68rem', color: C.muted }}>
        Forecast · pipeline · price drift · delivery risk · returns · cash
      </div>
    </div>
  );

  // ── Card 1: Forecast at Completion ──
  const facPill: PillType = a.variancePct <= 0 ? 'pg' : a.variancePct <= 5 ? 'pa' : 'pr';
  const facLabel = a.variancePct <= 0 ? 'On Budget' : a.variancePct <= 5 ? 'Watch' : 'Over';

  // ── Card 2: Pipeline funnel — find bottleneck ──
  const stuck = a.pipeline.find(s =>
    (s.key === 'SUBMITTED' || s.key === 'PRICED') && (s.oldestDays || 0) > 5 && s.count > 0
  );
  const pipelinePill: PillType = stuck ? 'pa' : 'pg';

  // ── Card 3: Price Variance ──
  const pvPill: PillType = a.priceVariance.totalAdjustedDelta > 0 ? 'pr'
    : a.priceVariance.totalAdjustedDelta < 0 ? 'pg' : 'pm';
  const pvSub = a.priceVariance.adjustedLineCount > 0
    ? `${a.priceVariance.adjustedLineCount} of ${a.priceVariance.totalLineCount} lines re-priced`
    : `No supplier adjustments on ${a.priceVariance.totalLineCount} lines`;

  // ── Card 4: Delivery Risk ──
  const drPill: PillType = a.deliveryRisk.lateCount > 0 ? 'pr'
    : (a.deliveryRisk.onTimeRatePct ?? 100) >= 90 ? 'pg' : 'pa';

  // ── Card 5: Returns Impact ──
  const riPill: PillType = a.returnsImpact.returnRatePct > 5 ? 'pr'
    : a.returnsImpact.returnRatePct > 2 ? 'pa' : 'pg';

  // ── Card 6: Cash Exposure ──
  const cePill: PillType = a.cashExposure.aging.d60_plus > 0 ? 'pr'
    : a.cashExposure.aging.d31_60 > 0 ? 'pa' : 'pg';

  return (
    <div className="space-y-4">
      {SectionHeader}

      <KpiGrid>
        {/* ── 1. Forecast at Completion ── */}
        <KpiCard
          accent={C.purple}
          icon="🎯"
          iconBg={C.purpleBg}
          label="FORECAST AT COMPLETION"
          value={fmt(a.forecastAtCompletion)}
          sub={`Estimate ${fmt(a.estimateTotal)} · ${pctLabel(a.variancePct)} vs budget`}
          pills={[{ type: facPill, text: facLabel }]}
          idx={0}
        >
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Line', 'Amount']} />
              <tbody>
                <TRow cells={[<TdN>Estimate</TdN>, <TdM>{fmt(a.estimateTotal)}</TdM>]} />
                <TRow cells={[<TdN>Committed (POs ordered+)</TdN>, <TdM>{fmt(a.committedTotal)}</TdM>]} />
                <TRow cells={[<TdN>Delivered</TdN>, <TdM>{fmt(a.deliveredTotal)}</TdM>]} />
                <TRow cells={[<TdN>Forecast at Completion</TdN>, <TdM>{fmt(a.forecastAtCompletion)}</TdM>]} isTotal />
                <TRow
                  cells={[<TdN>Headroom remaining</TdN>, <TdM>{fmt(a.remainingHeadroom)}</TdM>]}
                  greenText={a.remainingHeadroom >= 0}
                />
              </tbody>
            </table>
            <div style={{ marginTop: 10, fontSize: '0.68rem', color: C.muted, lineHeight: 1.5 }}>
              FAC = committed + (estimate not yet committed × current overrun). Catches drift before it
              becomes the final number.
            </div>
          </div>
        </KpiCard>

        {/* ── 2. PO Pipeline Funnel ── */}
        <KpiCard
          accent={C.blue}
          icon="🚦"
          iconBg={C.blueBg}
          label="PO PIPELINE"
          value={`${a.pipeline.reduce((s, p) => s + p.count, 0)}`}
          sub={stuck ? `$${fmt(stuck.total).slice(1)} stuck in ${stuck.label.toLowerCase()} ${stuck.oldestDays}d` : 'Flow healthy across all stages'}
          pills={[{ type: pipelinePill, text: stuck ? 'Bottleneck' : 'Flowing' }]}
          idx={1}
        >
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Stage', 'POs', 'Value', 'Oldest']} />
              <tbody>
                {a.pipeline.map(s => (
                  <TRow
                    key={s.key}
                    cells={[
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: STAGE_COLOR[s.key] || C.faint }} />
                        <TdN>{s.label}</TdN>
                      </span>,
                      <TdM>{s.count}</TdM>,
                      <TdM>{s.total > 0 ? fmt(s.total) : '—'}</TdM>,
                      <TdM>{s.oldestDays != null ? `${s.oldestDays}d` : '—'}</TdM>,
                    ]}
                    onClick={() => onNavigate('purchase-orders')}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </KpiCard>

        {/* ── 3. Price Variance ── */}
        <KpiCard
          accent={C.amber}
          icon="💲"
          iconBg={C.amberPale}
          label="PRICE DRIFT VS ESTIMATE"
          value={a.priceVariance.totalAdjustedDelta >= 0 ? `+${fmt(a.priceVariance.totalAdjustedDelta)}` : `-${fmt(Math.abs(a.priceVariance.totalAdjustedDelta))}`}
          sub={pvSub}
          pills={[{ type: pvPill, text: a.priceVariance.totalAdjustedDelta > 0 ? 'Over' : a.priceVariance.totalAdjustedDelta < 0 ? 'Under' : 'No drift' }]}
          idx={2}
        >
          <div style={{ padding: 12 }}>
            {a.priceVariance.topOffenders.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>
                No supplier price adjustments on this project yet.
              </div>
            ) : (
              <>
                <div style={{ fontSize: '0.68rem', color: C.muted, marginBottom: 8 }}>
                  Top items where supplier price moved off the estimate
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <THead cols={['SKU', 'Description', 'Δ vs estimate']} />
                  <tbody>
                    {a.priceVariance.topOffenders.map((o, i) => (
                      <TRow
                        key={i}
                        cells={[
                          <TdN>{o.sku || '—'}</TdN>,
                          <span style={{ fontSize: '0.74rem' }}>{o.description.slice(0, 40)}{o.description.length > 40 ? '…' : ''}</span>,
                          <TdM>{o.delta >= 0 ? `+${fmt(o.delta)}` : `-${fmt(Math.abs(o.delta))}`}</TdM>,
                        ]}
                      />
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </KpiCard>

        {/* ── 4. Delivery Risk ── */}
        <KpiCard
          accent={C.red}
          icon="⏱️"
          iconBg={C.redBg}
          label="DELIVERY RISK"
          value={a.deliveryRisk.lateCount > 0 ? `${a.deliveryRisk.lateCount} late` : (a.deliveryRisk.onTimeRatePct != null ? `${a.deliveryRisk.onTimeRatePct}%` : '—')}
          sub={a.deliveryRisk.avgLeadTimeDays != null ? `Avg lead time ${a.deliveryRisk.avgLeadTimeDays}d · ${fmt(a.deliveryRisk.lateTotal)} at risk` : 'No lead time data yet'}
          pills={[{ type: drPill, text: a.deliveryRisk.lateCount > 0 ? 'Late' : 'On Time' }]}
          idx={3}
        >
          <div style={{ padding: 12 }}>
            {a.deliveryRisk.lateList.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>
                No POs running past their quoted lead time.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['PO #', 'Name', 'Days late', 'Value']} />
                <tbody>
                  {a.deliveryRisk.lateList.map(l => (
                    <TRow
                      key={l.id}
                      cells={[
                        <TdN>{l.po_number || '—'}</TdN>,
                        <span style={{ fontSize: '0.74rem' }}>{l.po_name || '—'}</span>,
                        <Pill type="pr">{l.daysLate}d</Pill>,
                        <TdM>{fmt(l.amount)}</TdM>,
                      ]}
                      onClick={() => onNavigate('purchase-orders')}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </KpiCard>

        {/* ── 5. Returns Impact ── */}
        <KpiCard
          accent={C.yellow}
          icon="↩️"
          iconBg={C.yellowBg}
          label="RETURNS & WASTE"
          value={fmt(a.returnsImpact.netCredit)}
          sub={`${a.returnsImpact.returnRatePct}% of delivered · restocking ${fmt(a.returnsImpact.restockingTotal)}`}
          pills={[{ type: riPill, text: `${a.returnsImpact.returnRatePct}%` }]}
          idx={4}
        >
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Reason', 'Credit']} />
              <tbody>
                {a.returnsImpact.topReasons.length === 0 ? (
                  <tr><td colSpan={2} style={{ padding: 16, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No returns logged.</td></tr>
                ) : a.returnsImpact.topReasons.map((r, i) => (
                  <TRow key={i} cells={[<TdN>{r.reason}</TdN>, <TdM>{fmt(r.total)}</TdM>]} />
                ))}
                <TRow cells={[<TdN>Net credit</TdN>, <TdM>{fmt(a.returnsImpact.netCredit)}</TdM>]} isTotal />
              </tbody>
            </table>
            <div style={{ marginTop: 10, fontSize: '0.68rem', color: C.muted, lineHeight: 1.5 }}>
              Returns silently inflate true material cost. Track ratio to spot over-ordering or spec issues early.
            </div>
          </div>
        </KpiCard>

        {/* ── 6. Cash Exposure ── */}
        <KpiCard
          accent={C.green}
          icon="💵"
          iconBg={C.greenBg}
          label="CASH EXPOSURE (PAYABLES)"
          value={fmt(a.cashExposure.openCommitments + a.cashExposure.unpaidInvoicesTotal)}
          sub={`${fmt(a.cashExposure.openCommitments)} committed · ${fmt(a.cashExposure.unpaidInvoicesTotal)} invoiced unpaid`}
          pills={[{ type: cePill, text: a.cashExposure.aging.d60_plus > 0 ? '60d+' : a.cashExposure.aging.d31_60 > 0 ? '30-60d' : 'Current' }]}
          idx={5}
        >
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Bucket', 'Amount']} />
              <tbody>
                <TRow cells={[<TdN>Current</TdN>, <TdM>{fmt(a.cashExposure.aging.current)}</TdM>]} />
                <TRow cells={[<TdN>1-30 days</TdN>, <TdM>{fmt(a.cashExposure.aging.d1_30)}</TdM>]} />
                <TRow cells={[<TdN>31-60 days</TdN>, <TdM>{fmt(a.cashExposure.aging.d31_60)}</TdM>]} />
                <TRow cells={[<TdN>60+ days</TdN>, <TdM>{fmt(a.cashExposure.aging.d60_plus)}</TdM>]} />
                <TRow cells={[<TdN>Open commitments (no invoice yet)</TdN>, <TdM>{fmt(a.cashExposure.openCommitments)}</TdM>]} isTotal />
                <TRow cells={[<TdN>Expected outflow next 14d</TdN>, <TdM>{fmt(a.cashExposure.next14DaysOutflow)}</TdM>]} />
              </tbody>
            </table>
            <div style={{ marginTop: 10, fontSize: '0.68rem', color: C.muted, lineHeight: 1.5 }}>
              The payable mirror of the supplier's A/R card. Knowing what you owe keeps cash from going negative.
            </div>
          </div>
        </KpiCard>
      </KpiGrid>

      {/* ── Pack-level variance table ── */}
      {a.packs.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: C.ink, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              📦 Per-Pack Variance
            </div>
            <div style={{ fontSize: '0.66rem', color: C.muted }}>{a.packs.length} packs · click to open POs</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <THead cols={['Pack', 'Estimate', 'Ordered', 'Delivered', 'Variance', 'Status']} />
            <tbody>
              {a.packs.map(p => {
                const pill: PillType = p.status === 'over' ? 'pr' : p.status === 'watch' ? 'pa' : 'pg';
                const label = p.status === 'over' ? 'Over' : p.status === 'watch' ? 'Watch' : 'OK';
                return (
                  <TRow
                    key={p.packName}
                    cells={[
                      <TdN>{p.packName}</TdN>,
                      <TdM>{fmt(p.estimate)}</TdM>,
                      <TdM>{fmt(p.ordered)}</TdM>,
                      <TdM>{fmt(p.delivered)}</TdM>,
                      <TdM>{p.variance >= 0 ? `+${fmt(p.variance)}` : `-${fmt(Math.abs(p.variance))}`} ({pctLabel(p.variancePct)})</TdM>,
                      <Pill type={pill}>{label}</Pill>,
                    ]}
                    onClick={() => onNavigate('purchase-orders')}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
