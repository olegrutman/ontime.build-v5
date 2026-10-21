import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { C, fontVal, fontLabel, fmt, Pill, type PillType } from '@/components/shared/KpiCard';
import type { PackOverDetail, UpcomingDelivery } from '@/hooks/useSupplierDashboardData';

export interface HubRow {
  projectId: string;
  name: string;
  builder: string;
  status: string;
  phase: string;
  estimate: number;
  pendingEstimate: number;
  ordered: number;
  billed: number;
  received: number;
  displayOverBy: number;
  packOverDetails: PackOverDetail[];
  daysSinceLastPayment: number | null;
  risk: 'On Track' | 'Watch' | 'Over Budget';
}

type Filter = 'all' | 'action' | 'over' | 'unbilled' | 'aging';

interface Action { label: string; cta: string; tone: 'critical' | 'warning' | 'info' }

function actionsFor(r: HubRow): Action[] {
  const out: Action[] = [];
  const ar = r.billed - r.received;
  if (r.estimate <= 0) out.push({ label: 'Estimate missing', cta: 'Add estimate', tone: 'warning' });
  if (r.displayOverBy > 0) out.push({ label: `${fmt(r.displayOverBy)} over estimate`, cta: 'Review packs', tone: r.risk === 'Over Budget' ? 'critical' : 'warning' });
  if (r.ordered - r.billed > 0) out.push({ label: `${fmt(r.ordered - r.billed)} not invoiced`, cta: 'Create invoice', tone: 'warning' });
  if (ar > 0) {
    const stale = r.daysSinceLastPayment !== null && r.daysSinceLastPayment > 30;
    out.push({ label: `${fmt(ar)} awaiting payment`, cta: 'Follow up', tone: stale ? 'critical' : 'info' });
  }
  return out;
}

const TONE: Record<Action['tone'], { bg: string; fg: string }> = {
  critical: { bg: C.redBg, fg: C.red },
  warning: { bg: C.amberPale, fg: C.amberD },
  info: { bg: C.blueBg, fg: C.blue },
};

const pillFor = (r: HubRow): PillType => (r.risk === 'Over Budget' ? 'pr' : r.risk === 'Watch' ? 'pa' : 'pg');

export function SupplierProjectHealthHub({ rows, deliveries }: { rows: HubRow[]; deliveries: UpcomingDelivery[] }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');

  const active = useMemo(() => rows.filter(r => !['archived', 'completed'].includes(r.status)), [rows]);
  const tests: Record<Filter, (r: HubRow) => boolean> = {
    all: () => true,
    action: r => actionsFor(r).length > 0,
    over: r => r.displayOverBy > 0,
    unbilled: r => r.ordered - r.billed > 0,
    aging: r => r.billed - r.received > 0 && (r.daysSinceLastPayment ?? 0) > 30,
  };
  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All projects' },
    { id: 'action', label: 'Needs action' },
    { id: 'over', label: 'Over budget' },
    { id: 'unbilled', label: 'Unbilled' },
    { id: 'aging', label: 'Aging AR >30d' },
  ];
  const shown = active.filter(tests[filter]);
  const tot = shown.reduce((s, r) => ({ e: s.e + r.estimate, o: s.o + r.ordered, b: s.b + r.billed, ar: s.ar + (r.billed - r.received) }), { e: 0, o: 0, b: 0, ar: 0 });

  const mono = 'font-mono';
  const head: React.CSSProperties = { fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, fontWeight: 700 };
  const buckets = [['Current', 0, 30], ['31–60', 31, 60], ['61–90', 61, 90], ['90+', 91, 1e9]] as const;
  const arRows = active.map(r => ({ ar: r.billed - r.received, d: r.daysSinceLastPayment ?? 0 })).filter(x => x.ar > 0);
  const aging = buckets.map(([l, lo, hi]) => ({ l, v: arRows.filter(x => x.d >= lo && x.d <= hi).reduce((s, x) => s + x.ar, 0) }));
  const maxAge = Math.max(1, ...aging.map(x => x.v));
  const allAr = aging.reduce((s, x) => s + x.v, 0);
  const upcoming = [...deliveries].sort((x, y) => x.deliveryDate.localeCompare(y.deliveryDate)).slice(0, 5);
  const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16 };

  return (
    <div style={{ ...fontLabel }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', maxWidth: '100%' }}>
          {tabs.map(t => {
            const n = active.filter(tests[t.id]).length;
            const on = filter === t.id;
            return (
              <button key={t.id} onClick={() => setFilter(t.id)}
                style={{ flexShrink: 0, fontSize: '0.76rem', fontWeight: 600, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${on ? C.amber : C.border}`, background: on ? C.amber : C.surface, color: on ? C.surface : C.ink, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                {t.label}
                <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: on ? 'rgba(255,255,255,0.25)' : C.bg, color: on ? C.surface : C.muted }}>{n}</span>
              </button>
            );
          })}
        </div>
        <button onClick={() => navigate('/projects/archive')} style={{ fontSize: '0.72rem', fontWeight: 700, color: C.amber, background: 'none', border: 'none', cursor: 'pointer' }}>View archive →</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4">
        <div>
          {shown.length === 0 ? (
            <div style={{ ...card, padding: '32px 16px', textAlign: 'center', color: C.muted, fontSize: '0.82rem' }}>
              {active.length === 0 ? 'No active projects yet' : 'Nothing in this view — all clear.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shown.map(r => {
                const acts = actionsFor(r);
                const a0 = acts[0];
                const pct = r.estimate > 0 ? Math.round((r.ordered / r.estimate) * 100) : null;
                const barColor = pct === null ? C.border : pct > 100 ? C.red : pct >= 90 ? C.amber : C.green;
                const stages = [['Estimated', r.estimate], ['Ordered', r.ordered], ['Billed', r.billed], ['Paid', r.received]] as const;
                const reached = stages.filter(([, v]) => v > 0).length;
                return (
                  <div key={r.projectId} style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <button onClick={() => navigate(`/project/${r.projectId}`)} style={{ minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        <div className="font-heading" style={{ fontSize: '1.2rem', fontWeight: 700, color: C.ink, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{r.name}</div>
                        <div style={{ fontSize: '0.74rem', color: C.muted, marginTop: 3 }}>{r.builder} · {r.phase}</div>
                      </button>
                      <div style={{ flexShrink: 0 }}><Pill type={pillFor(r)}>{r.risk}</Pill></div>
                    </div>

                    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                      <div style={{ position: 'absolute', top: 8, left: '12.5%', right: '12.5%', height: 2, background: C.border }} />
                      <div style={{ position: 'absolute', top: 8, left: '12.5%', width: `${Math.max(0, reached - 1) * 25}%`, height: 2, background: C.amber }} />
                      {stages.map(([l, v], i) => (
                        <div key={l} style={{ position: 'relative', textAlign: 'center', minWidth: 0 }}>
                          <div style={{ width: 18, height: 18, borderRadius: 999, margin: '0 auto', background: i < reached ? C.amber : C.surface, border: `2px solid ${i < reached ? C.amber : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.surface, fontSize: 10, fontWeight: 800 }}>{i < reached ? '✓' : ''}</div>
                          <div style={{ ...head, marginTop: 6 }}>{l}</div>
                          <div className={mono} style={{ fontSize: '0.8rem', fontWeight: 600, color: v > 0 ? C.ink : C.faint, marginTop: 2, whiteSpace: 'nowrap' }}>{v > 0 ? fmt(v) : '—'}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 4, background: C.border, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(pct ?? 0, 100)}%`, height: '100%', background: barColor }} />
                      </div>
                      <span className={mono} style={{ fontSize: '0.74rem', fontWeight: 700, color: pct !== null && pct > 100 ? C.red : C.ink }}>{pct !== null ? `${pct}%` : '—'}</span>
                      <span style={{ fontSize: '0.68rem', color: C.muted, whiteSpace: 'nowrap' }}>ordered vs estimate</span>
                    </div>
                    {r.pendingEstimate > 0 && <div style={{ fontSize: '0.7rem', color: C.blue, fontWeight: 600, marginTop: -6 }}>+{fmt(r.pendingEstimate)} estimate pending approval</div>}

                    <button onClick={() => navigate(`/project/${r.projectId}`)}
                      style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left', background: a0 ? TONE[a0.tone].bg : C.greenBg, color: a0 ? TONE[a0.tone].fg : C.green, ...fontLabel }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{a0 ? `${a0.cta} →` : '✓ All clear'}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, minWidth: 0, textAlign: 'right' }}>{a0 ? a0.label : ''}{acts.length > 1 ? ` · +${acts.length - 1} more` : ''}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ ...card, padding: 18 }}>
            <div className="font-heading" style={{ fontSize: '1.1rem', fontWeight: 700, color: C.ink, marginBottom: 12 }}>Upcoming deliveries</div>
            {upcoming.length === 0 ? <Empty>No deliveries scheduled</Empty> : upcoming.map((d, i) => {
              const days = Math.floor((new Date(d.deliveryDate).getTime() - Date.now()) / 86400000);
              const when = days < 0 ? `${-days}d overdue` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : new Date(d.deliveryDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <div key={d.id} style={{ display: 'flex', gap: 10, paddingBottom: i < upcoming.length - 1 ? 12 : 0 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 999, marginTop: 4, flexShrink: 0, background: days <= 0 ? (days < 0 ? C.red : C.amber) : C.border }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: days < 0 ? C.red : days === 0 ? C.amber : C.muted }}>{when}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.ink, overflowWrap: 'anywhere' }}>{d.projectName}</div>
                    <div style={{ fontSize: '0.7rem', color: C.muted }}>{d.poNumber}{d.total ? ` · ${fmt(d.total)}` : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ ...card, padding: 18 }}>
            <div className="font-heading" style={{ fontSize: '1.1rem', fontWeight: 700, color: C.ink }}>Accounts receivable</div>
            <div className={mono} style={{ fontSize: '1.6rem', fontWeight: 700, color: allAr > 0 ? C.ink : C.green, marginTop: 6 }}>{fmt(allAr)}</div>
            <div style={{ fontSize: '0.7rem', color: C.muted, marginBottom: 14 }}>{allAr > 0 ? 'Total outstanding' : 'Everything billed is collected'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, alignItems: 'end', height: 90 }}>
              {aging.map((x, i) => (
                <div key={x.l} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', textAlign: 'center' }}>
                  <div className={mono} style={{ fontSize: '0.62rem', color: C.ink, fontWeight: 600, marginBottom: 3 }}>{x.v > 0 ? fmt(x.v) : ''}</div>
                  <div style={{ height: `${x.v > 0 ? Math.max(8, (x.v / maxAge) * 60) : 3}px`, borderRadius: 4, background: x.v > 0 ? (i === 0 ? C.amber : C.red) : C.border }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 5 }}>
              {aging.map(x => <div key={x.l} style={{ fontSize: '0.62rem', color: C.muted, textAlign: 'center' }}>{x.l}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <div style={{ fontSize: '0.72rem', color: C.muted }}>{children}</div>;
