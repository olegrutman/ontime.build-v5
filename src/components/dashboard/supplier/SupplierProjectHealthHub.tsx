import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Truck } from 'lucide-react';
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
  const [open, setOpen] = useState<string | null>(null);

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

  const mono = "font-mono";
  const accent = (r: HubRow) => (r.risk === 'Over Budget' ? C.red : r.risk === 'Watch' ? C.amber : C.green);
  const cols = 'minmax(220px,2.2fr) 110px minmax(90px,1fr) minmax(130px,1.2fr) minmax(110px,1fr) minmax(150px,1.2fr)';
  const head: React.CSSProperties = { fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, fontWeight: 700 };

  return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', ...fontLabel }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, padding: '18px 20px 14px' }}>
        <div style={{ minWidth: 0 }}>
          <div className="font-heading" style={{ fontSize: '1.35rem', fontWeight: 700, color: C.ink, letterSpacing: '0.2px' }}>Project health &amp; actions</div>
          <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 2 }}>Where each job stands and what to do next</div>
        </div>
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          {[['Estimated', tot.e, C.ink], ['Ordered', tot.o, C.ink], ['Billed', tot.b, C.ink], ['Open AR', tot.ar, tot.ar > 0 ? C.amberD : C.green]].map(([l, v, c]) => (
            <div key={l as string} style={{ textAlign: 'right' }}>
              <div style={head}>{l as string}</div>
              <div className={mono} style={{ fontSize: '1.05rem', fontWeight: 600, color: c as string, marginTop: 2 }}>{fmt(v as number)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '0 20px 14px', overflowX: 'auto', borderBottom: `1px solid ${C.border}` }}>
        {tabs.map(t => {
          const n = active.filter(tests[t.id]).length;
          const on = filter === t.id;
          return (
            <button key={t.id} onClick={() => { setFilter(t.id); setOpen(null); }}
              style={{ flexShrink: 0, fontSize: '0.74rem', fontWeight: 600, padding: '7px 13px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${on ? C.ink : C.border}`, background: on ? C.ink : C.surface, color: on ? C.surface : C.ink, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {t.label}
              <span style={{ fontSize: '0.66rem', fontWeight: 700, minWidth: 18, padding: '1px 6px', borderRadius: 999, background: on ? 'rgba(255,255,255,0.18)' : C.bg, color: on ? C.surface : C.muted }}>{n}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: C.muted, fontSize: '0.82rem' }}>
          {active.length === 0 ? 'No active projects yet' : 'Nothing in this view — all clear.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 860 }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 16, padding: '10px 20px 10px 24px', background: C.bg, borderBottom: `1px solid ${C.border}` }}>
              <div style={head}>Project</div><div style={head}>Health</div>
              <div style={{ ...head, textAlign: 'right' }}>Estimate</div><div style={{ ...head, textAlign: 'right' }}>Ordered</div>
              <div style={{ ...head, textAlign: 'right' }}>Billed</div><div style={head}>Next step</div>
            </div>
            {shown.map(r => {
              const acts = actionsFor(r);
              const isOpen = open === r.projectId;
              const pct = r.estimate > 0 ? Math.round((r.ordered / r.estimate) * 100) : null;
              const ar = r.billed - r.received;
              const next = deliveries.filter(d => d.projectId === r.projectId).sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
              return (
                <div key={r.projectId} style={{ borderBottom: `1px solid ${C.border}`, boxShadow: `inset 3px 0 0 ${accent(r)}` }}>
                  <div onClick={() => setOpen(isOpen ? null : r.projectId)} className="hover:bg-muted/40 transition-colors"
                    style={{ display: 'grid', gridTemplateColumns: cols, gap: 16, alignItems: 'center', padding: '14px 20px 14px 24px', cursor: 'pointer', background: isOpen ? C.bg : undefined }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      {isOpen ? <ChevronDown size={16} color={C.muted} style={{ flexShrink: 0 }} /> : <ChevronRight size={16} color={C.muted} style={{ flexShrink: 0 }} />}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.builder} · {r.phase}</div>
                      </div>
                    </div>
                    <div><Pill type={pillFor(r)}>{r.risk}</Pill></div>
                    <div style={{ textAlign: 'right' }}>
                      <div className={mono} style={{ fontSize: '0.86rem', fontWeight: 600, color: r.estimate > 0 ? C.ink : C.faint }}>{r.estimate > 0 ? fmt(r.estimate) : '—'}</div>
                      {r.pendingEstimate > 0 && <div style={{ fontSize: '0.66rem', color: C.blue, fontWeight: 600, marginTop: 2 }}>+{fmt(r.pendingEstimate)} pending</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className={mono} style={{ fontSize: '0.86rem', fontWeight: 600, color: r.ordered > 0 ? C.ink : C.faint }}>{r.ordered > 0 ? fmt(r.ordered) : '—'}</div>
                      {pct !== null && r.ordered > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 5 }}>
                          <div style={{ width: 64, height: 5, borderRadius: 3, background: C.border, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct > 100 ? C.red : C.green }} />
                          </div>
                          <span className={mono} style={{ fontSize: '0.66rem', color: pct > 100 ? C.red : C.muted, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className={mono} style={{ fontSize: '0.86rem', fontWeight: 600, color: r.billed > 0 ? C.ink : C.faint }}>{r.billed > 0 ? fmt(r.billed) : '—'}</div>
                      {ar > 0 && <div style={{ fontSize: '0.66rem', fontWeight: 600, marginTop: 2, color: (r.daysSinceLastPayment ?? 0) > 30 ? C.red : C.amberD }}>{fmt(ar)} open{r.daysSinceLastPayment !== null ? ` · ${r.daysSinceLastPayment}d` : ''}</div>}
                    </div>
                    <div>
                      {acts.length === 0 ? (
                        <span style={{ fontSize: '0.74rem', color: C.green, fontWeight: 600 }}>✓ All clear</span>
                      ) : (
                        <div style={{ minWidth: 0 }}>
                          <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, padding: '5px 10px', borderRadius: 8, background: TONE[acts[0].tone].bg, color: TONE[acts[0].tone].fg, whiteSpace: 'nowrap' }}>{acts[0].cta} →</span>
                          {acts.length > 1 && <div style={{ fontSize: '0.64rem', color: C.muted, marginTop: 3 }}>+{acts.length - 1} more</div>}
                        </div>
                      )}
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, padding: '4px 20px 18px 50px', background: C.bg }}>
                            <Panel title="Material packs">
                              {r.packOverDetails.length === 0 ? (
                                <Empty>{r.estimate > 0 ? 'All packs within estimate' : 'No approved estimate yet'}</Empty>
                              ) : r.packOverDetails.map(p => (
                                <div key={p.packName} style={{ marginBottom: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.72rem' }}>
                                    <span style={{ fontWeight: 700, color: C.ink, minWidth: 0, overflowWrap: 'anywhere' }}>{p.packName}</span>
                                    <span style={{ ...fontVal, color: C.red, fontWeight: 700, whiteSpace: 'nowrap' }}>+{fmt(p.overBy)}</span>
                                  </div>
                                  <div style={{ height: 5, borderRadius: 3, background: C.border, marginTop: 4, overflow: 'hidden' }}>
                                    <div style={{ width: '100%', height: '100%', background: C.red }} />
                                  </div>
                                  <div style={{ fontSize: '0.6rem', color: C.muted, marginTop: 2 }}>{fmt(p.ordered)} ordered vs {fmt(p.estimate)} est · {Math.round(p.overPct)}% over</div>
                                </div>
                              ))}
                            </Panel>
                            <Panel title="What to do">
                              {acts.length === 0 ? <Empty>Nothing waiting on you</Empty> : acts.map(a => (
                                <button key={a.cta} onClick={() => navigate(`/project/${r.projectId}`)}
                                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '7px 9px', marginBottom: 6, borderRadius: 9, border: 'none', cursor: 'pointer', background: TONE[a.tone].bg, color: TONE[a.tone].fg, textAlign: 'left', ...fontLabel }}>
                                  <span style={{ fontSize: '0.7rem', minWidth: 0 }}>{a.label}</span>
                                  <span style={{ fontSize: '0.66rem', fontWeight: 800, whiteSpace: 'nowrap' }}>{a.cta} →</span>
                                </button>
                              ))}
                            </Panel>
                            <Panel title="Upcoming deliveries">
                              {next.length === 0 ? <Empty>No deliveries scheduled</Empty> : next.slice(0, 3).map(d => {
                                const days = Math.floor((new Date(d.deliveryDate).getTime() - Date.now()) / 86400000);
                                return (
                                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: '0.72rem' }}>
                                    <Truck size={13} color={days < 0 ? C.red : C.blue} style={{ flexShrink: 0 }} />
                                    <span style={{ fontWeight: 700, color: C.ink }}>{d.poNumber}</span>
                                    <span style={{ color: days < 0 ? C.red : C.muted, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                                      {days < 0 ? `${-days}d overdue` : days === 0 ? 'Today' : `In ${days}d`}
                                    </span>
                                  </div>
                                );
                              })}
                              <button onClick={() => navigate(`/project/${r.projectId}`)} style={{ marginTop: 4, fontSize: '0.68rem', fontWeight: 700, color: C.amber, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Open project →</button>
                            </Panel>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, minWidth: 0 }}>
      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: C.faint, fontWeight: 700, marginBottom: 9 }}>{title}</div>
      {children}
    </div>
  );
}
const Empty = ({ children }: { children: React.ReactNode }) => <div style={{ fontSize: '0.72rem', color: C.muted }}>{children}</div>;
