import type { ReactNode } from 'react';
import { C, fontVal, fontMono, fontLabel, fmt, fmtSigned } from '@/components/shared/KpiCard';

interface Row {
  label: string;
  value: string | number;
  tone?: 'pos' | 'neg' | 'neutral' | 'muted';
  emphasis?: boolean;
  signed?: boolean;
}

interface SummaryCardProps {
  title: string;
  accent: string;
  icon?: ReactNode;
  rows: Row[];
  footer?: ReactNode;
}

function SummaryCard({ title, accent, icon, rows, footer }: SummaryCardProps) {
  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${accent}`,
        padding: '14px 16px',
        display: 'flex', flexDirection: 'column',
        ...fontLabel,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.muted, fontWeight: 700 }}>
          {title}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {rows.map((r, i) => {
          const toneColor =
            r.tone === 'pos' ? C.green :
            r.tone === 'neg' ? C.red :
            r.tone === 'muted' ? C.muted :
            C.ink;
          const valueStr = typeof r.value === 'number'
            ? (r.signed ? fmtSigned(r.value) : fmt(r.value))
            : r.value;
          return (
            <div
              key={`${r.label}-${i}`}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                gap: 8, flexWrap: 'wrap',
                paddingTop: r.emphasis ? 6 : 0,
                borderTop: r.emphasis ? `1px solid ${C.border}` : 'none',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: C.muted, fontWeight: r.emphasis ? 700 : 500, minWidth: 0, flex: '1 1 auto' }}>
                {r.label}
              </span>
              <span
                style={{
                  fontSize: r.emphasis ? '0.95rem' : '0.82rem',
                  color: toneColor,
                  ...fontMono,
                  fontWeight: r.emphasis ? 700 : 600,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {valueStr}
              </span>
            </div>

          );
        })}
      </div>
      {footer && <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: '0.68rem', color: C.faint }}>{footer}</div>}
    </div>
  );
}

interface OverviewSummaryStripProps {
  contract: {
    label: string;
    revisedIn: number;
    revisedOut: number;
    margin: number;
    marginPct: number;
  };
  cashFlow: {
    received: number;
    paid: number;
    cashPosition: number;
    owedToYou: number;
    youOwe?: number;
    retainage?: number;
  };
  changeOrders: {
    approvedCount: number;
    pendingCount: number;
    approvedNet: number;
    pendingNetAtRisk: number;
  };
  receivablePartyLabel?: string;
  payablePartyLabel?: string;
}

export function OverviewSummaryStrip({
  contract,
  cashFlow,
  changeOrders,
  receivablePartyLabel = 'upstream',
  payablePartyLabel = 'downstream',
}: OverviewSummaryStripProps) {
  const pctRounded = Math.round(contract.marginPct);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">

      <SummaryCard
        title="Contract"
        accent={C.amber}
        icon="📜"
        rows={[
          { label: `Revised in (from ${receivablePartyLabel})`, value: contract.revisedIn },
          { label: `Revised out (to ${payablePartyLabel})`, value: contract.revisedOut, tone: 'muted' },
          { label: 'Projected margin', value: contract.margin, tone: contract.margin >= 0 ? 'pos' : 'neg', emphasis: true, signed: true },
          { label: 'Margin %', value: `${pctRounded >= 0 ? '+' : ''}${pctRounded}%`, tone: pctRounded >= 20 ? 'pos' : pctRounded >= 5 ? 'neutral' : 'neg' },
        ]}
        footer={`Original + approved change orders on both sides`}
      />

      <SummaryCard
        title="Cash Flow"
        accent={C.green}
        icon="💵"
        rows={[
          { label: `Received from ${receivablePartyLabel}`, value: cashFlow.received, tone: 'pos' },
          { label: `Paid out to ${payablePartyLabel}`, value: cashFlow.paid, tone: 'neg' },
          { label: 'Cash position', value: cashFlow.cashPosition, tone: cashFlow.cashPosition >= 0 ? 'pos' : 'neg', emphasis: true, signed: true },
          { label: `Owed to you (unpaid)`, value: cashFlow.owedToYou, tone: cashFlow.owedToYou > 0 ? 'neutral' : 'muted' },
          ...(cashFlow.youOwe !== undefined ? [{ label: 'You owe (unpaid)', value: cashFlow.youOwe, tone: cashFlow.youOwe > 0 ? ('neutral' as const) : ('muted' as const) }] : []),
          ...(cashFlow.retainage && cashFlow.retainage > 0 ? [{ label: 'Retainage held', value: cashFlow.retainage, tone: 'muted' as const }] : []),
        ]}
        footer="Collected minus paid — working capital, not profit"
      />

      <SummaryCard
        title="Change Orders"
        accent={C.blue}
        icon="📝"
        rows={[
          { label: `Approved (${changeOrders.approvedCount})`, value: changeOrders.approvedNet, tone: changeOrders.approvedNet >= 0 ? 'pos' : 'neg', signed: true, emphasis: true },
          { label: `Pending (${changeOrders.pendingCount}) — at risk`, value: changeOrders.pendingNetAtRisk, tone: changeOrders.pendingNetAtRisk >= 0 ? 'neutral' : 'neg', signed: true },
        ]}
        footer={changeOrders.pendingCount === 0
          ? 'No pending change orders'
          : 'Pending COs not yet approved — shown separately so they do not distort approved margin'}
      />
    </div>
  );
}
