import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { C, fontVal, fontMono, fontLabel, fmt } from '@/components/shared/KpiCard';

export interface SnapshotRow {
  projectId: string;
  name: string;
  status: string;
  estimate: number;
  pendingEstimate: number;
  pendingEstimateCount: number;
  ordered: number;
  billed: number;
  received: number;
  overBy: number;
  packOverBy: number;
  packsOverCount: number;
  daysSinceLastPayment: number | null;
  risk: 'On Track' | 'Watch' | 'Over Budget';
}

interface DeliveryLike {
  projectId: string;
  deliveryDate: string;
}

interface Props {
  rows: SnapshotRow[];
  deliveries: DeliveryLike[];
}

const RISK_COLOR: Record<SnapshotRow['risk'], { fg: string; bg: string }> = {
  'On Track': { fg: C.greenDark, bg: C.greenBg },
  'Watch': { fg: C.amberD, bg: C.amberPale },
  'Over Budget': { fg: C.red, bg: C.redBg },
};

export function SupplierProjectSnapshot({ rows, deliveries }: Props) {
  const navigate = useNavigate();

  const active = useMemo(
    () => rows.filter(r => !['archived', 'completed'].includes(r.status)),
    [rows]
  );

  // Default to project with most activity
  const defaultId = useMemo(() => {
    const pool = active.length > 0 ? active : rows;
    if (pool.length === 0) return 'all';
    const best = [...pool].sort(
      (a, b) =>
        (b.estimate + b.ordered + b.billed) - (a.estimate + a.ordered + a.billed)
    )[0];
    return best.projectId;
  }, [active, rows]);

  const [selected, setSelected] = useState<string>(defaultId);
  const pool = active.length > 0 ? active : rows;
  const effective = pool.some(p => p.projectId === selected) || selected === 'all' ? selected : defaultId;

  const agg = useMemo(() => {
    const set = effective === 'all' ? pool : pool.filter(p => p.projectId === effective);
    const sum = (fn: (r: SnapshotRow) => number) => set.reduce((s, r) => s + fn(r), 0);
    const dayVals = set.map(r => r.daysSinceLastPayment).filter((d): d is number => d !== null);
    const worst = set.reduce<SnapshotRow['risk']>((acc, r) => {
      const rank = { 'On Track': 0, 'Watch': 1, 'Over Budget': 2 } as const;
      return rank[r.risk] > rank[acc] ? r.risk : acc;
    }, 'On Track');
    return {
      name: effective === 'all' ? 'All projects' : (set[0]?.name ?? '—'),
      count: set.length,
      estimate: sum(r => r.estimate),
      pendingEstimate: sum(r => r.pendingEstimate),
      pendingEstimateCount: sum(r => r.pendingEstimateCount),
      ordered: sum(r => r.ordered),
      billed: sum(r => r.billed),
      received: sum(r => r.received),
      overBy: sum(r => Math.max(r.overBy, r.packOverBy)),
      packsOverCount: sum(r => r.packsOverCount),
      daysSinceLastPayment: dayVals.length > 0 ? Math.min(...dayVals) : null,
      risk: worst,
    };
  }, [effective, pool]);

  const deliveryCount = useMemo(() => {
    if (effective === 'all') return deliveries.length;
    return deliveries.filter(d => d.projectId === effective).length;
  }, [deliveries, effective]);

  const scale = Math.max(agg.estimate, agg.ordered, agg.billed, agg.received, 1);
  const base = agg.estimate > 0 ? agg.estimate : Math.max(agg.ordered, 1);
  const overOrdered = agg.ordered > agg.estimate && agg.estimate > 0;

  const stages = [
    { key: 'estimate', label: 'Estimated', value: agg.estimate, color: C.navyL },
    { key: 'ordered', label: 'Ordered', value: agg.ordered, color: overOrdered ? C.red : C.amber },
    { key: 'billed', label: 'Billed', value: agg.billed, color: C.blue },
    { key: 'received', label: 'Received', value: agg.received, color: C.green },
  ];

  const connectors = [
    overOrdered
      ? { text: `+${fmt(agg.ordered - agg.estimate)} over estimate`, color: C.red, up: true }
      : { text: `-${fmt(Math.max(0, agg.estimate - agg.ordered))} unordered`, color: C.muted, up: false },
    { text: `-${fmt(Math.max(0, agg.ordered - agg.billed))} not billed`, color: C.muted, up: false },
    { text: `-${fmt(Math.max(0, agg.billed - agg.received))} awaiting payment`, color: C.amberD, up: false },
  ];

  const hasActivity = agg.estimate > 0 || agg.ordered > 0 || agg.billed > 0 || agg.received > 0;
  const risk = RISK_COLOR[agg.risk];

  if (pool.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      {/* Header + project switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          style={{ ...fontLabel, fontSize: '0.7rem', letterSpacing: '0.08em', color: C.muted, fontWeight: 700 }}
          className="uppercase shrink-0"
        >
          Project snapshot
        </div>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 sm:pb-0 sm:justify-end">
          {[{ id: 'all', name: 'All projects' }, ...pool.map(p => ({ id: p.projectId, name: p.name }))].map(opt => {
            const on = opt.id === effective;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelected(opt.id)}
                className="shrink-0 rounded-full px-3 py-1 transition-colors"
                style={{
                  ...fontLabel,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: on ? C.navy : C.surface2,
                  color: on ? '#FFFFFF' : C.ink2,
                  border: `1px solid ${on ? C.navy : C.border}`,
                  maxWidth: 180,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {opt.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Headline */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="truncate"
              style={{ ...fontVal, fontSize: '1.35rem', color: C.ink, lineHeight: 1.1 }}
            >
              {agg.name}
            </div>
            <span
              className="rounded-full px-2 py-0.5 shrink-0"
              style={{ ...fontLabel, fontSize: '0.62rem', fontWeight: 800, background: risk.bg, color: risk.fg }}
            >
              {agg.risk}
            </span>
          </div>
          {effective === 'all' && (
            <div style={{ ...fontLabel, fontSize: '0.68rem', color: C.faint }}>
              {agg.count} project{agg.count === 1 ? '' : 's'}
            </div>
          )}
        </div>
        <div className="flex gap-6">
          <div>
            <div className="uppercase" style={{ ...fontLabel, fontSize: '0.6rem', letterSpacing: '0.08em', color: C.faint, fontWeight: 700 }}>
              Ordered
            </div>
            <div style={{ ...fontMono, fontSize: '1rem', color: C.ink }}>{fmt(agg.ordered)}</div>
          </div>
          <div>
            <div className="uppercase" style={{ ...fontLabel, fontSize: '0.6rem', letterSpacing: '0.08em', color: C.faint, fontWeight: 700 }}>
              Outstanding
            </div>
            <div style={{ ...fontMono, fontSize: '1rem', color: agg.billed - agg.received > 0 ? C.amberD : C.ink }}>
              {fmt(Math.max(0, agg.billed - agg.received))}
            </div>
          </div>
        </div>
      </div>

      {/* Funnel */}
      {!hasActivity ? (
        <div
          className="mt-4 rounded-xl p-4 text-center"
          style={{ background: C.surface2, border: `1px dashed ${C.border}` }}
        >
          <div style={{ ...fontLabel, fontSize: '0.8rem', color: C.muted, fontWeight: 600 }}>
            {agg.pendingEstimateCount > 0
              ? `${agg.pendingEstimateCount} estimate${agg.pendingEstimateCount === 1 ? '' : 's'} · ${fmt(agg.pendingEstimate)} pending approval`
              : 'No estimate or orders yet'}
          </div>
          {effective !== 'all' && (
            <button
              type="button"
              onClick={() => navigate(`/project/${effective}`)}
              className="mt-2 inline-flex items-center gap-1"
              style={{ ...fontLabel, fontSize: '0.72rem', fontWeight: 800, color: C.amberD }}
            >
              {agg.pendingEstimateCount > 0 ? 'View estimate' : 'Add estimate'} <ChevronRight size={13} />
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {stages.map((s, i) => {
            const pct = base > 0 ? Math.round((s.value / base) * 100) : 0;
            const width = Math.max(2, (s.value / scale) * 100);
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
                      <div
                        className="h-full rounded-md transition-all"
                        style={{ width: `${width}%`, background: s.color }}
                      />
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
                    <div
                      className="flex-1 truncate"
                      style={{ ...fontLabel, fontSize: '0.64rem', fontWeight: 600, color: conn.color }}
                    >
                      {conn.up ? '↑' : '↓'} {conn.text}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasActivity && agg.pendingEstimateCount > 0 && (
        <div
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl p-3"
          style={{ background: C.amberPale, border: `1px solid ${C.amber}`, ...fontLabel }}
        >
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: C.ink2 }}>
            {agg.pendingEstimateCount} estimate{agg.pendingEstimateCount === 1 ? '' : 's'} · {fmt(agg.pendingEstimate)} pending approval
          </span>
          {effective !== 'all' && (
            <button
              type="button"
              onClick={() => navigate(`/project/${effective}/estimates`)}
              className="inline-flex items-center gap-1"
              style={{ ...fontLabel, fontSize: '0.7rem', fontWeight: 800, color: C.amberD }}
            >
              View estimate <ChevronRight size={13} />
            </button>
          )}
        </div>
      )}

      {/* Footer stats */}
      <div
        className="mt-4 pt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <FootStat
          label="Over estimate"
          value={agg.overBy > 0 ? `+${fmt(agg.overBy)}${agg.packsOverCount > 0 ? ` (${agg.packsOverCount} pack${agg.packsOverCount === 1 ? '' : 's'})` : ''}` : '—'}
          color={agg.overBy > 0 ? C.red : C.ink2}
        />
        <FootStat
          label="Last payment"
          value={agg.daysSinceLastPayment !== null ? `${agg.daysSinceLastPayment}d ago` : '—'}
          color={agg.daysSinceLastPayment !== null && agg.daysSinceLastPayment > 30 ? C.amberD : C.ink2}
        />
        <FootStat
          label="Deliveries"
          value={deliveryCount > 0 ? `${deliveryCount} upcoming` : '—'}
          color={deliveryCount > 0 ? C.blue : C.ink2}
        />
        {effective !== 'all' && (
          <button
            type="button"
            onClick={() => navigate(`/project/${effective}`)}
            className="ml-auto inline-flex items-center gap-1"
            style={{ ...fontLabel, fontSize: '0.7rem', fontWeight: 800, color: C.amberD }}
          >
            Open project <ChevronRight size={13} />
          </button>
        )}
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
