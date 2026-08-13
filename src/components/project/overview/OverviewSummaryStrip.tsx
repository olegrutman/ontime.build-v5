import type { ReactNode } from 'react';
import { ScrollText, Banknote } from 'lucide-react';
import { C, fontMono, fontLabel, fmt, fmtSigned } from '@/components/shared/KpiCard';

interface Row {
  label: string;
  value: string | number;
  tone?: 'pos' | 'neg' | 'neutral' | 'muted';
  emphasis?: boolean;
  signed?: boolean;
}

function LedgerGroup({ title, icon, rows, footer }: { title: string; icon: ReactNode; rows: Row[]; footer?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-2.5">
        <span style={{ color: C.faint, display: 'inline-flex' }}>{icon}</span>
        <span
          style={{
            fontSize: '0.62rem',
            textTransform: 'uppercase',
            letterSpacing: '1.4px',
            color: C.muted,
            fontWeight: 800,
          }}
        >
          {title}
        </span>
      </div>
      <div className="flex flex-col">
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
              className="flex items-baseline justify-between gap-3"
              style={{
                padding: '6px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
              }}
            >
              <span
                className="truncate"
                style={{ fontSize: '0.8rem', color: C.muted, fontWeight: r.emphasis ? 700 : 500 }}
              >
                {r.label}
              </span>
              <span
                style={{
                  fontSize: '0.85rem',
                  color: toneColor,
                  fontWeight: r.emphasis ? 700 : 600,
                  whiteSpace: 'nowrap',
                  ...fontMono,
                }}
              >
                {valueStr}
              </span>
            </div>
          );
        })}
      </div>
      {footer && (
        <div style={{ marginTop: 8, fontSize: '0.7rem', color: C.faint, lineHeight: 1.4 }}>{footer}</div>
      )}
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
    /** Committed material cost (approved supplier estimates) inside revisedOut. */
    materialCommitment?: number;
    /** Label for the material commitment row. */
    materialLabel?: string;
  };
  cashFlow: {
    received: number;
    paid: number;
    cashPosition: number;
    owedToYou: number;
    youOwe?: number;
    retainage?: number;
    /** Cash paid to the downstream sub only (excludes suppliers). */
    paidToSubs?: number;
    /** Cash paid to suppliers on POs the viewer's org owns. */
    paidToSuppliers?: number;
  };
  changeOrders: {
    approvedCount: number;
    pendingCount: number;
    approvedNet: number;
    pendingNetAtRisk: number;
  };
  receivablePartyLabel?: string;
  payablePartyLabel?: string;
  /** Hide margin & "owed to you" numbers when upstream contract is unset. */
  awaitingUpstream?: boolean;
}

/**
 * One accounting ledger card. Projected margin, margin %, cash position and CO
 * net live in the dark hero above, so this card carries only the underlying
 * contract and cash lines — no repeated headline numbers.
 */
export function OverviewSummaryStrip({
  contract,
  cashFlow,
  changeOrders,
  receivablePartyLabel = 'upstream',
  payablePartyLabel = 'downstream',
  awaitingUpstream = false,
}: OverviewSummaryStripProps) {
  const dash = '—';

  const contractRows: Row[] = [
    { label: `Revised in (${receivablePartyLabel})`, value: awaitingUpstream ? dash : contract.revisedIn, emphasis: true },
    { label: `Revised out (${payablePartyLabel})`, value: contract.revisedOut, tone: 'muted' },
    ...(contract.materialCommitment && contract.materialCommitment > 0
      ? [{ label: '↳ Materials contract', value: contract.materialCommitment, tone: 'muted' as const }]
      : []),
    {
      label: `Change orders · ${changeOrders.approvedCount} approved / ${changeOrders.pendingCount} pending`,
      value: fmtSigned(changeOrders.approvedNet),
      tone: changeOrders.approvedNet >= 0 ? 'pos' : 'neg',
    },
  ];

  const cashRows: Row[] = [
    { label: `Received from ${receivablePartyLabel}`, value: cashFlow.received, tone: cashFlow.received > 0 ? 'pos' : 'muted', emphasis: true },
    { label: `Paid out to ${payablePartyLabel}`, value: cashFlow.paid, tone: cashFlow.paid > 0 ? 'neg' : 'muted' },
    ...(cashFlow.paidToSuppliers && cashFlow.paidToSuppliers > 0
      ? [
          { label: '↳ Subcontract', value: (cashFlow.paidToSubs ?? Math.max(0, cashFlow.paid - cashFlow.paidToSuppliers)), tone: 'muted' as const },
          { label: '↳ Suppliers (materials)', value: cashFlow.paidToSuppliers, tone: 'muted' as const },
        ]
      : []),
    { label: 'Owed to you', value: awaitingUpstream ? dash : cashFlow.owedToYou, tone: cashFlow.owedToYou > 0 ? 'neutral' : 'muted' },
    ...(cashFlow.youOwe !== undefined
      ? [{ label: 'You owe', value: cashFlow.youOwe, tone: cashFlow.youOwe > 0 ? ('neutral' as const) : ('muted' as const) }]
      : []),
    ...(cashFlow.retainage && cashFlow.retainage > 0
      ? [{ label: 'Retainage held', value: cashFlow.retainage, tone: 'muted' as const }]
      : []),
  ];

  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
      style={{ background: C.surface, border: `1px solid ${C.border}`, ...fontLabel }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
        <LedgerGroup
          title={contract.label}
          icon={<ScrollText size={14} />}
          rows={contractRows}
          footer={awaitingUpstream
            ? `Set the ${receivablePartyLabel} contract value to see projected margin`
            : 'Original + approved change orders on both sides'}
        />
        <LedgerGroup
          title="Cash flow"
          icon={<Banknote size={14} />}
          rows={cashRows}
          footer="Collected minus paid — working capital, not profit"
        />
      </div>
    </div>
  );
}
