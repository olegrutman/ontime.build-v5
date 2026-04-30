import { useState } from 'react';
import { C, fontLabel, fontMono, fmt, Pill, KpiCard, THead, TdN, TdM, TRow, type PillType } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import type { SupplierProjectAnalytics } from '@/hooks/useSupplierProjectAnalytics';

interface Props {
  analytics: SupplierProjectAnalytics | undefined;
  loading: boolean;
  estimateTotal: number;
  orderedTotal: number;
  onNavigate: (tab: string) => void;
}

const EVENT_META: Record<SupplierProjectAnalytics['events'][number]['type'], { color: string; icon: string }> = {
  PO_CREATED:    { color: C.amber,  icon: '📄' },
  PO_ORDERED:    { color: C.amberD, icon: '📦' },
  PO_DELIVERED:  { color: C.green,  icon: '🚚' },
  INV_SUBMITTED: { color: C.blue,   icon: '🧾' },
  INV_PAID:      { color: C.green,  icon: '💰' },
  RETURN:        { color: C.red,    icon: '↩️' },
  CO:            { color: C.purple, icon: '🔧' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Sparkline({ values, color = C.amber }: { values: number[]; color?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            width: 12,
            height: `${Math.max(4, (v / max) * 28)}px`,
            background: v > 0 ? color : C.border,
            borderRadius: 2,
          }}
          title={`Week ${i + 1}: ${v} POs`}
        />
      ))}
    </div>
  );
}

export function SupplierProjectAnalyticsSection({ analytics, loading, estimateTotal, orderedTotal, onNavigate }: Props) {
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  if (loading || !analytics) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: C.muted, fontSize: '0.78rem', ...fontLabel }}>
        Loading analytics…
      </div>
    );
  }

  const a = analytics;

  // Section header
  const SectionHeader = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: -4, ...fontLabel }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 4, height: 18, background: C.amber, borderRadius: 2 }} />
        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: C.ink, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Project Analytics
        </div>
      </div>
      <div style={{ fontSize: '0.68rem', color: C.muted }}>Real-world yard view · sell-through, A/R, ops, returns, margin, demand</div>
    </div>
  );

  // ── Card 7: Sell-Through ──
  const stalePill: PillType =
    a.daysSinceLastPO === null ? 'pm'
    : a.daysSinceLastPO <= 7 ? 'pg'
    : a.daysSinceLastPO <= 21 ? 'pa'
    : 'pr';
  const stalePillText =
    a.daysSinceLastPO === null ? 'No POs' : `${a.daysSinceLastPO}d since last PO`;

  // ── Card 8: A/R Aging ──
  const totalOpenAR = a.aging.current + a.aging.d1_30 + a.aging.d31_60 + a.aging.d61_90 + a.aging.d90_plus;
  const lienDays = a.lienDeadline
    ? Math.floor((new Date(a.lienDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const lienPill: PillType = lienDays === null ? 'pm' : lienDays <= 0 ? 'pr' : lienDays <= 30 ? 'pw' : 'pg';

  // ── Card 9: Delivery Perf ──
  const leadPill: PillType = a.avgLeadTimeDays === null ? 'pm' : a.avgLeadTimeDays <= 7 ? 'pg' : a.avgLeadTimeDays <= 14 ? 'pa' : 'pr';

  // ── Card 10: Returns ──
  const returnRatePill: PillType = a.returnRatePct === 0 ? 'pg' : a.returnRatePct <= 3 ? 'pa' : 'pr';

  // ── Card 11: Margin & Pricing ──
  const overridePill: PillType = a.priceOverrideCount === 0 ? 'pg' : a.priceOverrideTotal > 1000 ? 'pr' : 'pa';

  // ── Card 12: Future Demand ──
  const demandPill: PillType = a.activeCOs.count > 0 ? 'pn' : 'pm';

  const filteredEvents = filterType === 'ALL' ? a.events : a.events.filter(e => e.type === filterType);

  return (
    <div className="space-y-4">
      {SectionHeader}

      <KpiGrid>
        {/* Card 7 — Sell-Through */}
        <KpiCard
          accent={C.amber}
          icon="🎯"
          iconBg={C.amberPale}
          label="SELL-THROUGH & WALLET"
          value={fmt(a.remainingEstimate)}
          sub={`${a.walletCapturePct}% of estimate captured · ${fmt(a.remainingEstimate)} left to sell`}
          pills={[{ type: stalePill, text: stalePillText }]}
          idx={6}
        >
          <div style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: '0.66rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, ...fontLabel }}>POs / Week (last 4)</div>
                <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: 2 }}>oldest → newest</div>
              </div>
              <Sparkline values={a.poCountByWeek} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <TRow cells={[<TdN>Estimate (project)</TdN>, <TdM>{fmt(estimateTotal)}</TdM>]} />
                <TRow cells={[<TdN>Already ordered</TdN>, <TdM>{fmt(orderedTotal)}</TdM>]} />
                <TRow cells={[<TdN>Remaining wallet</TdN>, <TdM>{fmt(a.remainingEstimate)}</TdM>]} isTotal />
                <TRow cells={[<TdN>Packs not yet ordered</TdN>, <TdM>{a.packsNotOrderedCount}</TdM>]} />
              </tbody>
            </table>
          </div>
        </KpiCard>

        {/* Card 8 — A/R Aging */}
        <KpiCard
          accent={C.red}
          icon="⏱"
          iconBg={C.redBg}
          label="PROJECT A/R AGING"
          value={fmt(totalOpenAR)}
          sub={a.oldestPastDueDays !== null ? `Oldest past-due: ${a.oldestPastDueDays}d · Avg DSO: ${a.avgDsoDays ?? '—'}d` : `Avg DSO: ${a.avgDsoDays ?? '—'}d`}
          pills={[
            { type: lienPill, text: lienDays === null ? 'No deliveries' : lienDays <= 0 ? 'Lien clock expired' : `Lien clock: ${lienDays}d` },
          ]}
          idx={7}
        >
          <div style={{ padding: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <THead cols={['Bucket', 'Open A/R']} />
              <tbody>
                <TRow cells={[<TdN>Current</TdN>, <TdM>{fmt(a.aging.current)}</TdM>]} />
                <TRow cells={[<TdN>1–30 days</TdN>, <TdM>{fmt(a.aging.d1_30)}</TdM>]} />
                <TRow cells={[<TdN>31–60 days</TdN>, <TdM>{fmt(a.aging.d31_60)}</TdM>]} />
                <TRow cells={[<TdN>61–90 days</TdN>, <TdM>{fmt(a.aging.d61_90)}</TdM>]} />
                <TRow cells={[<TdN>90+ days</TdN>, <span style={{ color: a.aging.d90_plus > 0 ? C.red : C.muted, ...fontMono, fontSize: '0.78rem' }}>{fmt(a.aging.d90_plus)}</span>]} />
                <TRow cells={[<TdN>Total Open</TdN>, <TdM>{fmt(totalOpenAR)}</TdM>]} isTotal />
              </tbody>
            </table>
            {a.firstDeliveryAt && (
              <div style={{ marginTop: 10, padding: 8, background: C.surface2, borderRadius: 6, fontSize: '0.7rem', color: C.muted }}>
                First delivery: <strong style={{ color: C.ink }}>{fmtDate(a.firstDeliveryAt)}</strong> · 90-day lien window default
              </div>
            )}
          </div>
        </KpiCard>

        {/* Card 9 — Delivery Performance */}
        <KpiCard
          accent={C.blue}
          icon="🚛"
          iconBg={C.blueBg}
          label="DELIVERY OPERATIONS"
          value={a.avgLeadTimeDays !== null ? `${a.avgLeadTimeDays}d` : '—'}
          sub={`Avg lead time · ${a.upcomingDeliveries.length} upcoming load${a.upcomingDeliveries.length === 1 ? '' : 's'}`}
          pills={[{ type: leadPill, text: a.avgLeadTimeDays === null ? 'No data' : a.avgLeadTimeDays <= 7 ? 'Fast' : a.avgLeadTimeDays <= 14 ? 'Normal' : 'Slow' }]}
          idx={8}
        >
          <div style={{ padding: 14 }}>
            {a.upcomingDeliveries.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['PO #', 'Target', 'Amount']} />
                <tbody>
                  {a.upcomingDeliveries.map(d => (
                    <TRow key={d.id} cells={[
                      <TdN>{d.po_number || d.po_name || '—'}</TdN>,
                      <span style={{ fontSize: '0.74rem', color: C.muted }}>{fmtDate(d.date)}</span>,
                      <TdM>{fmt(d.amount)}</TdM>,
                    ]} />
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No upcoming deliveries</div>
            )}
            <div style={{ marginTop: 10, padding: 8, background: C.surface2, borderRadius: 6, fontSize: '0.66rem', color: C.faint, fontStyle: 'italic' }}>
              OTIF % and partial-fill tracking unlock once requested-delivery dates and shipment splits are captured.
            </div>
          </div>
        </KpiCard>

        {/* Card 10 — Returns Impact */}
        <KpiCard
          accent={C.red}
          icon="↩️"
          iconBg={C.redBg}
          label="RETURNS & CREDITS"
          value={fmt(a.returnsTotal)}
          sub={a.returnRatePct > 0 ? `${a.returnRatePct}% return rate · ${a.openCreditMemos} open credit${a.openCreditMemos === 1 ? '' : 's'}` : 'No returns issued'}
          pills={[{ type: returnRatePill, text: a.returnRatePct === 0 ? 'Clean' : `${a.returnRatePct}% rate` }]}
          idx={9}
        >
          <div style={{ padding: 14 }}>
            {a.topReturnReasons.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['Reason', 'Credit $']} />
                <tbody>
                  {a.topReturnReasons.map(r => (
                    <TRow key={r.reason} cells={[<TdN>{r.reason}</TdN>, <TdM>{fmt(r.total)}</TdM>]} />
                  ))}
                  <TRow cells={[<TdN>Total Returns</TdN>, <TdM>{fmt(a.returnsTotal)}</TdM>]} isTotal />
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: C.green, fontSize: '0.78rem', fontWeight: 600 }}>No returns on this project ✓</div>
            )}
          </div>
        </KpiCard>

        {/* Card 11 — Margin & Pricing Health */}
        <KpiCard
          accent={C.purple}
          icon="📈"
          iconBg={C.purpleBg}
          label="PRICING HEALTH"
          value={a.priceOverrideCount > 0 ? `${a.priceOverrideCount}` : '0'}
          sub={a.priceOverrideTotal > 0 ? `${fmt(a.priceOverrideTotal)} discounted from list` : 'No price overrides'}
          pills={[{ type: overridePill, text: a.priceOverrideCount === 0 ? 'List pricing' : `${fmt(a.priceOverrideTotal)} given` }]}
          idx={10}
        >
          <div style={{ padding: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <TRow cells={[<TdN>Lines with overrides</TdN>, <TdM>{a.priceOverrideCount}</TdM>]} />
                <TRow cells={[<TdN>Discount given (list − sold)</TdN>, <TdM>{fmt(a.priceOverrideTotal)}</TdM>]} />
                <TRow cells={[<TdN>Realized GM%</TdN>, <span style={{ fontSize: '0.74rem', color: C.muted, fontStyle: 'italic' }}>Cost data needed</span>]} />
              </tbody>
            </table>
            <div style={{ marginTop: 10, padding: 8, background: C.surface2, borderRadius: 6, fontSize: '0.66rem', color: C.faint, fontStyle: 'italic' }}>
              Add unit cost on line items to unlock realized GM% per pack.
            </div>
          </div>
        </KpiCard>

        {/* Card 12 — Future Demand */}
        <KpiCard
          accent={C.green}
          icon="🔭"
          iconBg={C.greenBg}
          label="FUTURE DEMAND SIGNAL"
          value={a.activeCOs.count > 0 ? fmt(a.activeCOs.total) : '$0'}
          sub={`${a.activeCOs.count} active change order${a.activeCOs.count === 1 ? '' : 's'} · ${a.packsNotOrderedCount} pack${a.packsNotOrderedCount === 1 ? '' : 's'} unstarted`}
          pills={[{ type: demandPill, text: a.activeCOs.count > 0 ? `${a.activeCOs.count} CO${a.activeCOs.count === 1 ? '' : 's'} pending` : 'No upcoming demand' }]}
          idx={11}
        >
          <div style={{ padding: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <TRow cells={[<TdN>Active change orders</TdN>, <TdM>{a.activeCOs.count}</TdM>]} />
                <TRow cells={[<TdN>CO scope value</TdN>, <TdM>{fmt(a.activeCOs.total)}</TdM>]} />
                <TRow cells={[<TdN>Packs not yet ordered</TdN>, <TdM>{a.packsNotOrderedCount}</TdM>]} />
              </tbody>
            </table>
            <button
              onClick={() => onNavigate('purchase-orders')}
              style={{ width: '100%', marginTop: 10, padding: '8px', borderRadius: 6, background: C.amber, color: '#fff', fontWeight: 700, fontSize: '0.72rem', border: 'none', cursor: 'pointer', ...fontLabel }}
            >
              + Pre-Stage Material
            </button>
          </div>
        </KpiCard>
      </KpiGrid>

      {/* Project Activity Timeline */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
        <button
          onClick={() => setTimelineOpen(!timelineOpen)}
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: timelineOpen ? `1px solid ${C.border}` : 'none', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.ink }}>📜 Project Activity Timeline</span>
            <Pill type="pm">{a.events.length} events</Pill>
          </div>
          <span style={{ fontSize: '0.72rem', color: C.muted, fontWeight: 600 }}>{timelineOpen ? '▾ Collapse' : '▸ Expand'}</span>
        </button>
        {timelineOpen && (
          <div>
            <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
              {(['ALL', 'PO_CREATED', 'PO_ORDERED', 'PO_DELIVERED', 'INV_SUBMITTED', 'INV_PAID', 'RETURN', 'CO'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  style={{
                    fontSize: '0.66rem', fontWeight: 700, padding: '4px 10px', borderRadius: 12,
                    border: `1px solid ${filterType === t ? C.amber : C.border}`,
                    background: filterType === t ? C.amberPale : 'transparent',
                    color: filterType === t ? C.amberD : C.muted,
                    cursor: 'pointer', ...fontLabel,
                  }}
                >
                  {t === 'ALL' ? 'All' : t.replace('_', ' ').replace('PO ', 'PO ').toLowerCase()}
                </button>
              ))}
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {filteredEvents.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: '0.78rem' }}>No events</div>
              ) : (
                filteredEvents.map((e, i) => {
                  const meta = EVENT_META[e.type];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        {meta.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: C.ink, ...fontLabel }}>{e.title}</div>
                        <div style={{ fontSize: '0.68rem', color: C.muted, marginTop: 2 }}>
                          {new Date(e.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                      {e.amount != null && e.amount > 0 && (
                        <div style={{ ...fontMono, fontSize: '0.78rem', color: C.ink2, fontWeight: 600 }}>{fmt(e.amount)}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
