import { C, fontVal, fontMono, fontLabel, fmt } from '@/components/shared/KpiCard';
import { ChevronRight } from 'lucide-react';

export interface SupplierFunnelProps {
  projectName: string;
  supplierName: string;
  estimate: number;
  ordered: number;
  billed: number;
  received: number;
  overBy?: number;
  packsOverCount?: number;
  daysSinceLastPayment?: number | null;
  upcomingDeliveries?: number;
  onNavigate: (tab: string) => void;
}

type Risk = 'On Track' | 'Watch' | 'Over Budget';

const RISK_COLOR: Record<Risk, { fg: string; bg: string }> = {
  'On Track': { fg: C.greenDark, bg: C.greenBg },
  'Watch': { fg: C.amberD, bg: C.amberPale },
  'Over Budget': { fg: C.red, bg: C.redBg },
};

export function SupplierProjectFunnel({
  projectName,
  supplierName,
  estimate,
  ordered,
  billed,
  received,
  overBy = 0,
  packsOverCount = 0,
  daysSinceLastPayment = null,
  upcomingDeliveries = 0,
  onNavigate,
}: SupplierFunnelProps) {
  const outstanding = Math.max(0, billed - received);
  const overPct = estimate > 0 ? (overBy / estimate) * 100 : overBy > 0 ? 100 : 0;
  const risk: Risk = overBy <= 0 ? 'On Track' : overPct <= 5 ? 'Watch' : 'Over Budget';
  const riskTone = RISK_COLOR[risk];

  const scale = Math.max(estimate, ordered, billed, received, 1);
  const base = estimate > 0 ? estimate : Math.max(ordered, 1);
  const overOrdered = estimate > 0 && ordered > estimate;

  const stages = [
    { key: 'estimate', label: 'Estimated', value: estimate, color: C.navy },
    { key: 'ordered', label: 'Ordered', value: ordered, color: overOrdered ? C.red : C.amber },
    { key: 'billed', label: 'Billed', value: billed, color: C.blue },
    { key: 'received', label: 'Received', value: received, color: C.green },
  ];

  const connectors = [
    overOrdered
      ? { text: `+${fmt(ordered - estimate)} over estimate`, color: C.red, up: true }
      : { text: `-${fmt(Math.max(0, estimate - ordered))} unordered`, color: C.muted, up: false },
    { text: `-${fmt(Math.max(0, ordered - billed))} not billed`, color: C.muted, up: false },
    { text: `-${fmt(outstanding)} awaiting payment`, color: C.amberD, up: false },
  ];

  const hasActivity = estimate > 0 || ordered > 0 || billed > 0 || received > 0;

  // Next best action based on where the pipeline stalls
  const nextAction =
    estimate === 0
      ? { text: 'Add an estimate to set the material budget', label: 'Add estimate', tab: 'estimates' }
      : ordered === 0
        ? { text: `Nothing ordered against ${fmt(estimate)} estimate`, label: 'Create purchase order', tab: 'purchase-orders' }
        : billed < ordered
          ? { text: `${fmt(ordered - billed)} ready to invoice`, label: 'Submit invoice', tab: 'invoices' }
          : outstanding > 0
            ? { text: `${fmt(outstanding)} invoiced and awaiting payment`, label: 'View invoices', tab: 'invoices' }
            : null;

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div
            className="uppercase"
            style={{ ...fontLabel, fontSize: '0.62rem', letterSpacing: '0.08em', color: C.muted, fontWeight: 700 }}
          >
            Project snapshot
          </div>
          <div className="mt-1 flex items-center gap-2 min-w-0">
            <div className="truncate" style={{ ...fontVal, fontSize: '1.3rem', color: C.ink, lineHeight: 1.1 }}>
              {projectName}
            </div>
            <span
              className="rounded-full px-2 py-0.5 shrink-0"
              style={{ ...fontLabel, fontSize: '0.62rem', fontWeight: 800, background: riskTone.bg, color: riskTone.fg }}
            >
              {risk}
            </span>
          </div>
          <div style={{ ...fontLabel, fontSize: '0.7rem', color: C.faint }}>Supplier · {supplierName}</div>
        </div>
        <div className="flex gap-6 shrink-0">
          <div>
            <div className="uppercase" style={{ ...fontLabel, fontSize: '0.58rem', letterSpacing: '0.08em', color: C.faint, fontWeight: 700 }}>
              Ordered
            </div>
            <div style={{ ...fontMono, fontSize: '1rem', color: C.ink }}>{fmt(ordered)}</div>
          </div>
          <div>
            <div className="uppercase" style={{ ...fontLabel, fontSize: '0.58rem', letterSpacing: '0.08em', color: C.faint, fontWeight: 700 }}>
              Outstanding
            </div>
            <div style={{ ...fontMono, fontSize: '1rem', color: outstanding > 0 ? C.amberD : C.ink }}>{fmt(outstanding)}</div>
          </div>
        </div>
      </div>

      {/* Funnel */}
      {!hasActivity ? (
        <div className="mt-4 rounded-xl p-4 text-center" style={{ background: C.surface2, border: `1px dashed ${C.border}` }}>
          <div style={{ ...fontLabel, fontSize: '0.8rem', color: C.muted, fontWeight: 600 }}>No estimate or orders yet</div>
          <button
            type="button"
            onClick={() => onNavigate('estimates')}
            className="mt-2 inline-flex items-center gap-1"
            style={{ ...fontLabel, fontSize: '0.72rem', fontWeight: 800, color: C.amberD, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Add estimate <ChevronRight size={13} />
          </button>
        </div>
      ) : (
        <div className="mt-4">
          {stages.map((s, i) => {
            const pct = base > 0 ? Math.round((s.value / base) * 100) : 0;
            const width = Math.max(s.value > 0 ? 2 : 0.6, (s.value / scale) * 100);
            const conn = connectors[i];
            return (
              <div key={s.key}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className="uppercase shrink-0"
                    style={{ ...fontLabel, fontSize: '0.62rem', letterSpacing: '0.06em', color: C.muted, fontWeight: 700, width: 66 }}
                  >
                    {s.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="h-6 rounded-md overflow-hidden" style={{ background: C.surface2 }}>
                      <div className="h-full rounded-md transition-all" style={{ width: `${width}%`, background: s.color }} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right" style={{ width: 78 }}>
                    <span style={{ ...fontMono, fontSize: '0.8rem', color: C.ink }}>{fmt(s.value)}</span>
                  </div>
                  <div className="shrink-0 text-right hidden sm:block" style={{ width: 40 }}>
                    <span style={{ ...fontMono, fontSize: '0.72rem', color: C.faint }}>{pct}%</span>
                  </div>
                </div>
                {conn && (
                  <div className="flex items-center gap-2 sm:gap-3 py-1">
                    <div className="shrink-0" style={{ width: 66 }} />
                    <div className="flex-1 truncate" style={{ ...fontLabel, fontSize: '0.64rem', fontWeight: 600, color: conn.color }}>
                      {conn.up ? '↑' : '↓'} {conn.text}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Next action */}
      {hasActivity && nextAction && (
        <div
          className="mt-3 flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: C.surface2, border: `1px solid ${C.border}` }}
        >
          <div style={{ ...fontLabel, fontSize: '0.74rem', fontWeight: 600, color: C.ink2 }}>{nextAction.text}</div>
          <button
            type="button"
            onClick={() => onNavigate(nextAction.tab)}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-1.5"
            style={{ ...fontLabel, fontSize: '0.72rem', fontWeight: 800, background: C.amber, color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {nextAction.label} <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Footer stats */}
      <div className="mt-4 pt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5" style={{ borderTop: `1px solid ${C.border}` }}>
        <FootStat
          label="Over estimate"
          value={overBy > 0 ? `+${fmt(overBy)}${packsOverCount > 0 ? ` (${packsOverCount} pack${packsOverCount === 1 ? '' : 's'})` : ''}` : '—'}
          color={overBy > 0 ? C.red : C.ink2}
        />
        <FootStat
          label="Last payment"
          value={daysSinceLastPayment !== null ? `${daysSinceLastPayment}d ago` : '—'}
          color={daysSinceLastPayment !== null && daysSinceLastPayment > 30 ? C.amberD : C.ink2}
        />
        <FootStat
          label="Deliveries"
          value={upcomingDeliveries > 0 ? `${upcomingDeliveries} upcoming` : '—'}
          color={upcomingDeliveries > 0 ? C.blue : C.ink2}
        />
      </div>
    </div>
  );
}

function FootStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="uppercase"
        style={{ ...fontLabel, fontSize: '0.58rem', letterSpacing: '0.07em', color: C.faint, fontWeight: 700 }}
      >
        {label}
      </span>
      <span style={{ ...fontMono, fontSize: '0.74rem', color }}>{value}</span>
    </div>
  );
}
